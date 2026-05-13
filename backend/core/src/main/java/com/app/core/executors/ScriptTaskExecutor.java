package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.ScriptTaskExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.ScriptTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.service.TaskExecutor;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Engine;
import org.graalvm.polyglot.HostAccess;
import org.graalvm.polyglot.ResourceLimits;
import org.graalvm.polyglot.Value;
import org.graalvm.polyglot.io.IOAccess;
import org.springframework.stereotype.Component;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.*;

@Slf4j
@Component
public class ScriptTaskExecutor implements TaskExecutor {

    private record ScriptResult(Object data, String logs) {
    }

    @org.springframework.beans.factory.annotation.Value("${workflow.script.timeout-ms:30000}")
    private long defaultTimeoutMs;

    @org.springframework.beans.factory.annotation.Value("${workflow.script.max-memory-mb:256}")
    private int defaultMaxMemoryMb;

    // Template for wrapping the user script
    private final String WRAPPED_SCRIPT_TEMPLATE = """
                (function() {
                    const __workflow = JSON.parse(workflowJsonBindings);
                    const $input = __workflow.trigger || {};
                    const $variables = __workflow.variables || {};
                    const $tasks = __workflow.tasks || {};
                    const $env = __workflow.env || {};
                    const $loop = __workflow.loop || {};

                    const userScript = function() {
                        %s
                    };
                    const result = userScript();
                    if (result === undefined) return null;
                    return JSON.stringify(result);
                })();
            """;

    // Shared engine enables script compilation caching across contexts for
    // performance boost
    private final Engine sharedEngine;

    // Dedicated Virtual Thread Pool for Script Executions (Java 21+)
    private final ExecutorService scriptExecutorService = Executors.newVirtualThreadPerTaskExecutor();

    private final ObjectMapper objectMapper;

    public ScriptTaskExecutor(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.sharedEngine = Engine.newBuilder()
                .option("engine.WarnInterpreterOnly", "false")
                .build();
    }

    @PreDestroy
    public void cleanup() {
        if (sharedEngine != null) {
            sharedEngine.close();
        }
        if (scriptExecutorService != null) {
            scriptExecutorService.shutdownNow();
        }
    }

    @Override
    public boolean canExecute(TaskType taskType) {
        return TaskType.SCRIPT_TASK == taskType;
    }

    @Override
    public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
        ScriptTaskParameters params = (ScriptTaskParameters) task.getParameters();
        log.info("Executing script task: {}", task.getTaskId());

        long timeoutMs = params.getTimeoutMs() != null ? params.getTimeoutMs() : defaultTimeoutMs;
        // GraalVM Community Edition doesn't strictly support hard memory limits without
        // Enterprise extensions,
        // but we can enforce statement limits or soft limits. Timeouts are robust.

        try {
            // Build workflow context object for script using centralized method
            Map<String, Object> workflowData = context.getAllVariables();

            ScriptResult scriptResult = executeScriptWithTimeout(params.getScript(), workflowData, timeoutMs);

            Map<String, Object> output = new HashMap<>();
            output.put("result", scriptResult.data());

            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.COMPLETED)
                    .output(output)
                    .executionData(ScriptTaskExecutionData.builder()
                            .language(params.getLanguage())
                            .result(scriptResult.data())
                            .logs(scriptResult.logs())
                            .build())
                    .build();

        } catch (Exception e) {
            log.error("Script execution failed for task {}: {}", task.getTaskId(), e.getMessage(), e);
            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.FAILED)
                    .errorMessage("Script execution failed: " + e.getMessage())
                    .executionData(ScriptTaskExecutionData.builder()
                            .error(e.getClass().getSimpleName() + ": " + e.getMessage())
                            .build())
                    .build();
        }
    }

    private ScriptResult executeScriptWithTimeout(String script, Map<String, Object> workflowData, long timeoutMs)
            throws Exception {

        String wrappedScript = WRAPPED_SCRIPT_TEMPLATE.formatted(script);

        // Execute inside dedicated JAVA Virtual Thread Pool
        // This provides absolute isolation and zero OS thread blocking
        CompletableFuture<ScriptResult> future = CompletableFuture.supplyAsync(() -> {
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

            try (Context polyglotContext = Context.newBuilder("js")
                    .engine(sharedEngine)
                    .out(outputStream)
                    .err(outputStream)
                    // Restrict accesses - absolute must for security
                    .allowHostAccess(HostAccess.NONE)
                    .allowIO(IOAccess.NONE)
                    .allowCreateThread(false)
                    .allowNativeAccess(false)
                    // A safety bound on runaway scripts (e.g. 100M instructions)
                    .resourceLimits(ResourceLimits.newBuilder()
                            .statementLimit(100_000_000, null)
                            .build())
                    .build()) {

                // Inject workflow data securely across the sandbox boundary using JSON
                // Serialization!
                // This shields the pure HostAccess.NONE sandbox from trying (and failing) to
                // map Java maps!
                String workflowJson;
                try {
                    workflowJson = objectMapper.writeValueAsString(workflowData);
                } catch (Exception e) {
                    throw new RuntimeException("Failed to serialize workflow data to json", e);
                }
                Value bindings = polyglotContext.getBindings("js");
                bindings.putMember("workflowJsonBindings", workflowJson);

                Value jsonResult = polyglotContext.eval("js", wrappedScript);

                Object finalResult = null;
                if (!jsonResult.isNull()) {
                    try {
                        finalResult = objectMapper.readValue(jsonResult.asString(), Object.class);
                    } catch (Exception e) {
                        throw new RuntimeException("Failed to parse script output", e);
                    }
                }

                String logs = outputStream.toString(StandardCharsets.UTF_8).trim();
                return new ScriptResult(finalResult, logs.isEmpty() ? null : logs);
            }
        }, scriptExecutorService);

        try {
            return future.get(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            future.cancel(true); // Sends an interrupt signal to the Virtual Thread
            throw new RuntimeException("Script execution timed out after " + timeoutMs + " ms", e);
        }
    }
}
