package com.app.core.executors;

import com.app.common.constant.IntegrationCredentialTypes;
import com.app.common.entity.IntegrationCredential;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.McpToolTaskExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.McpToolTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.service.CredentialProvider;
import com.app.core.service.VariableResolver;
import com.app.capability.mcp.api.McpToolInvoker;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.spec.McpSchema;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class McpToolTaskExecutorTest {

    @Mock
    private CredentialProvider credentialProvider;
    @Mock
    private VariableResolver variableResolver;
    @Mock
    private McpToolInvoker mcpToolInvoker;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private McpToolTaskExecutor executor;

    @BeforeEach
    void setUp() {
        executor = new McpToolTaskExecutor(credentialProvider, variableResolver, mcpToolInvoker, objectMapper);
    }

    @Test
    void execute_invokesRemoteToolAndReturnsCompleted() {
        McpToolTaskParameters params = new McpToolTaskParameters();
        params.setCredentialId("cred-mcp");
        params.setRemoteToolName("search");
        params.setArguments(Map.of("query", "hello"));

        WorkflowTask task = new WorkflowTask();
        task.setTaskId("mcp_1");
        task.setType(TaskType.MCP_TOOL);
        task.setParameters(params);

        IntegrationCredential credential = new IntegrationCredential();
        credential.setId("cred-mcp");
        credential.setType(IntegrationCredentialTypes.MCP_SERVER);
        credential.setCredentials(Map.of("token", "secret"));

        ExecutionContext context = executionContext();

        when(variableResolver.resolveString("cred-mcp", context)).thenReturn("cred-mcp");
        when(variableResolver.resolveString("search", context)).thenReturn("search");
        when(credentialProvider.resolveCredential("cred-mcp", null, context)).thenReturn(Optional.of(credential));
        when(variableResolver.resolveMap(anyMap(), eq(context))).thenReturn(Map.of("query", "hello"));

        McpSchema.CallToolResult callResult = McpSchema.CallToolResult.builder()
                .content(List.of(McpSchema.TextContent.builder("ok").build()))
                .isError(false)
                .build();
        when(mcpToolInvoker.callTool(eq(credential), anyMap(), eq("search"), anyMap(), anyInt()))
                .thenReturn(callResult);

        TaskExecutionResult result = executor.execute(task, new WorkflowExecution(), context);

        assertThat(result.getStatus()).isEqualTo(TaskExecutionResult.Status.COMPLETED);
        assertThat(result.getExecutionData()).isInstanceOf(McpToolTaskExecutionData.class);
        assertThat(((McpToolTaskExecutionData) result.getExecutionData()).getRemoteToolName()).isEqualTo("search");
    }

    @Test
    void execute_failsWhenCredentialMissing() {
        McpToolTaskParameters params = new McpToolTaskParameters();
        params.setCredentialId("missing");
        params.setRemoteToolName("search");

        WorkflowTask task = new WorkflowTask();
        task.setTaskId("mcp_1");
        task.setType(TaskType.MCP_TOOL);
        task.setParameters(params);

        ExecutionContext context = executionContext();

        when(variableResolver.resolveString("missing", context)).thenReturn("missing");
        when(variableResolver.resolveString("search", context)).thenReturn("search");
        when(credentialProvider.resolveCredential("missing", null, context)).thenReturn(Optional.empty());

        TaskExecutionResult result = executor.execute(task, new WorkflowExecution(), context);

        assertThat(result.getStatus()).isEqualTo(TaskExecutionResult.Status.FAILED);
        assertThat(result.getErrorMessage()).contains("MCP credential not found");
    }

    private ExecutionContext executionContext() {
        WorkflowDefinition definition = new WorkflowDefinition();
        definition.setTasks(List.of());
        return ExecutionContext.builder()
                .workflowExecutionId("exec-1")
                .workflowDefinition(definition)
                .workflowVariables(new HashMap<>())
                .taskOutputs(new HashMap<>())
                .build();
    }
}
