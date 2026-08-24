package com.app.core.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Engine;
import org.graalvm.polyglot.HostAccess;
import org.graalvm.polyglot.ResourceLimits;
import org.graalvm.polyglot.Value;
import org.graalvm.polyglot.io.IOAccess;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.*;

@Slf4j
@Service
public class ScriptEvaluationService {

    public record ScriptResult(Object data, String logs) {}

    @org.springframework.beans.factory.annotation.Value("${workflow.script.timeout-ms:30000}")
    private long defaultTimeoutMs;

    private final String WRAPPED_SCRIPT_TEMPLATE = """
                (function() {
                    const __workflow = JSON.parse(workflowJsonBindings);
                    const $input = __workflow.trigger || __workflow.inputs || {};
                    const $variables = __workflow.variables || {};
                    const $tasks = __workflow.tasks || {};
                    const $env = __workflow.env || {};
                    const $loop = __workflow.loop || {};
                    
                    // Platform Generic Helpers
                    const $helpers = {
                        base64Encode: function(str) { return workflowHelpers.base64Encode(str); },
                        base64UrlEncode: function(str) { return workflowHelpers.base64UrlEncode(str); }
                    };

                    const userScript = function() {
                        %s
                    };
                    const result = userScript();
                    if (result === undefined) return null;
                    return JSON.stringify(result);
                })();
            """;

    // Safe helper methods exposed to the script
    public static class WorkflowHelpers {
        @HostAccess.Export
        public String base64Encode(String input) {
            if (input == null) return null;
            return Base64.getEncoder().encodeToString(input.getBytes(StandardCharsets.UTF_8));
        }

        @HostAccess.Export
        public String base64UrlEncode(String input) {
            if (input == null) return null;
            return Base64.getUrlEncoder().withoutPadding().encodeToString(input.getBytes(StandardCharsets.UTF_8));
        }
    }

    private final Engine sharedEngine;
    private final ExecutorService scriptExecutorService = Executors.newVirtualThreadPerTaskExecutor();
    private final ObjectMapper objectMapper;

    public ScriptEvaluationService(ObjectMapper objectMapper) {
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

    public ScriptResult executeScript(String script, Map<String, Object> workflowData) throws Exception {
        return executeScript(script, workflowData, defaultTimeoutMs);
    }

    public ScriptResult executeScript(String script, Map<String, Object> workflowData, long timeoutMs) throws Exception {
        String wrappedScript = String.format(WRAPPED_SCRIPT_TEMPLATE, script);

        CompletableFuture<ScriptResult> future = CompletableFuture.supplyAsync(() -> {
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

            try (Context polyglotContext = Context.newBuilder("js")
                    .engine(sharedEngine)
                    .out(outputStream)
                    .err(outputStream)
                    .allowHostAccess(HostAccess.EXPLICIT)
                    .allowIO(IOAccess.NONE)
                    .allowCreateThread(false)
                    .allowNativeAccess(false)
                    .resourceLimits(ResourceLimits.newBuilder()
                            .statementLimit(100_000_000, null)
                            .build())
                    .build()) {

                String workflowJson;
                try {
                    workflowJson = objectMapper.writeValueAsString(workflowData);
                } catch (Exception e) {
                    throw new RuntimeException("Failed to serialize workflow data to json", e);
                }
                
                Value bindings = polyglotContext.getBindings("js");
                bindings.putMember("workflowJsonBindings", workflowJson);
                bindings.putMember("workflowHelpers", new WorkflowHelpers());

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
            future.cancel(true);
            throw new RuntimeException("Script execution timed out after " + timeoutMs + " ms", e);
        }
    }
}
