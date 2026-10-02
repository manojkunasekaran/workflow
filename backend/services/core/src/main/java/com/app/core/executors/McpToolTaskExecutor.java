package com.app.core.executors;

import com.app.common.constant.IntegrationCredentialTypes;
import com.app.common.entity.IntegrationCredential;
import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.McpToolTaskExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.McpToolTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.service.CredentialProvider;
import com.app.core.service.TaskExecutor;
import com.app.core.service.VariableResolver;
import com.app.capability.mcp.api.McpToolInvoker;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.spec.McpSchema;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class McpToolTaskExecutor implements TaskExecutor {

    private final CredentialProvider credentialProvider;
    private final VariableResolver variableResolver;
    private final McpToolInvoker mcpToolInvoker;
    private final ObjectMapper objectMapper;

    @Override
    public boolean canExecute(TaskType taskType) {
        return TaskType.MCP_TOOL == taskType;
    }

    @Override
    public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
        log.info("Starting execution of MCP_TOOL Task: {}", task.getTaskId());

        if (!(task.getParameters() instanceof McpToolTaskParameters params)) {
            throw new IllegalArgumentException("Invalid parameters for MCP_TOOL task");
        }

        if (params.getCredentialId() == null || params.getCredentialId().isBlank()) {
            return failed("credentialId is required for MCP_TOOL task");
        }
        if (params.getRemoteToolName() == null || params.getRemoteToolName().isBlank()) {
            return failed("remoteToolName is required for MCP_TOOL task");
        }

        String resolvedCredentialId = variableResolver.resolveString(params.getCredentialId(), context);
        String remoteToolName = variableResolver.resolveString(params.getRemoteToolName(), context);

        Optional<IntegrationCredential> credentialOpt =
                credentialProvider.resolveCredential(resolvedCredentialId, null, context);
        if (credentialOpt.isEmpty()) {
            return failed("MCP credential not found: " + resolvedCredentialId);
        }

        IntegrationCredential credential = credentialOpt.get();
        if (!IntegrationCredentialTypes.MCP_SERVER.equals(credential.getType())) {
            return failed("Credential is not an MCP server connection: " + resolvedCredentialId);
        }

        try {
            Map<String, Object> args = resolveArguments(params.getArguments(), context);
            McpSchema.CallToolResult callResult = mcpToolInvoker.callTool(
                    credential,
                    credential.getCredentials(),
                    remoteToolName,
                    args,
                    params.timeoutSecondsOrDefault());

            McpToolTaskExecutionData executionData = McpToolTaskExecutionData.builder()
                    .remoteToolName(remoteToolName)
                    .result(callResult)
                    .isError(Boolean.TRUE.equals(callResult.isError()))
                    .build();

            TaskExecutionResult.Status status = Boolean.TRUE.equals(callResult.isError())
                    ? TaskExecutionResult.Status.FAILED
                    : TaskExecutionResult.Status.COMPLETED;

            return TaskExecutionResult.builder()
                    .status(status)
                    .executionData(executionData)
                    .output(buildOutput(executionData))
                    .errorMessage(status == TaskExecutionResult.Status.FAILED
                            ? "MCP tool call returned an error result"
                            : null)
                    .build();
        } catch (Exception e) {
            log.error("MCP_TOOL execution failed for task {}: {}", task.getTaskId(), e.getMessage(), e);
            return failed("MCP tool call failed: " + e.getMessage());
        }
    }

    private Map<String, Object> resolveArguments(Object arguments, ExecutionContext context) throws Exception {
        if (arguments == null) {
            return Map.of();
        }
        if (arguments instanceof String json) {
            String resolved = variableResolver.resolveString(json, context);
            if (resolved == null || resolved.isBlank()) {
                return Map.of();
            }
            return objectMapper.readValue(resolved, new TypeReference<Map<String, Object>>() {});
        }
        if (arguments instanceof Map<?, ?> map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> typed = (Map<String, Object>) map;
            return variableResolver.resolveMap(typed, context);
        }
        throw new IllegalArgumentException("arguments must be a JSON string or object map");
    }

    private TaskExecutionResult failed(String message) {
        return TaskExecutionResult.builder()
                .status(TaskExecutionResult.Status.FAILED)
                .errorMessage(message)
                .build();
    }
}
