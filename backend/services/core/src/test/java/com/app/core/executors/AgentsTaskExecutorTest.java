package com.app.core.executors;

import com.app.common.entity.IntegrationCredential;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.entity.WorkflowExecution;
import com.app.common.model.mcp.McpToolDescriptor;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.AgentsTaskExecutionData;
import com.app.common.model.task.parameters.AgentsTaskParameters;
import com.app.core.executors.llm.LlmProviderAdapter;
import com.app.core.model.ExecutionContext;
import com.app.core.service.CredentialProvider;
import com.app.core.service.VariableResolver;
import com.app.execution.events.ExecutionEventPublisher;
import com.app.capability.mcp.api.McpToolDiscoveryService;
import com.app.capability.mcp.api.McpToolInvoker;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.modelcontextprotocol.spec.McpSchema;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgentsTaskExecutorTest {

    @Mock
    private CredentialProvider credentialProvider;
    @Mock
    private VariableResolver variableResolver;
    @Mock
    private ExecutionEventPublisher eventPublisher;
    @Mock
    private List<LlmProviderAdapter> adapters;
    @Mock
    private McpToolDiscoveryService mcpToolDiscoveryService;
    @Mock
    private McpToolInvoker mcpToolInvoker;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private AgentsTaskExecutor executor;

    @BeforeEach
    void setUp() {
        executor = new AgentsTaskExecutor(
                credentialProvider,
                variableResolver,
                objectMapper,
                eventPublisher,
                adapters,
                mcpToolDiscoveryService,
                mcpToolInvoker);
    }

    @Test
    void resolveLlmToolName_usesCredentialSlugForMcpTools() {
        AgentsTaskParameters.AgentTool tool = new AgentsTaskParameters.AgentTool();
        tool.setSourceType(AgentsTaskParameters.AgentToolSource.MCP);
        tool.setCredentialId("cred-1");
        tool.setRemoteToolName("search");

        assertThat(AgentsTaskParameters.resolveLlmToolName(tool, "My MCP Server"))
                .isEqualTo("my_mcp_server__search");
    }

    @Test
    void executeTools_invokesMcpToolAndReturnsJsonResult() throws Exception {
        ExecutionContext executionContext = context();
        IntegrationCredential credential = new IntegrationCredential();
        credential.setId("cred-1");
        credential.setName("Server");
        credential.setCredentials(Map.of("token", "secret"));

        when(variableResolver.resolveString("cred-1", executionContext)).thenReturn("cred-1");
        when(credentialProvider.resolveCredential("cred-1", null, executionContext)).thenReturn(Optional.of(credential));
        when(mcpToolDiscoveryService.listTools(eq(credential), anyMap())).thenReturn(List.of(
                new McpToolDescriptor("search", "Search docs", Map.of("type", "object"))));

        McpSchema.CallToolResult callResult = McpSchema.CallToolResult.builder()
                .content(List.of(McpSchema.TextContent.builder("found").build()))
                .isError(false)
                .build();
        when(mcpToolInvoker.callTool(eq(credential), anyMap(), eq("search"), anyMap(), eq(30)))
                .thenReturn(callResult);

        AgentsTaskParameters params = new AgentsTaskParameters();
        AgentsTaskParameters.AgentTool toolDef = mcpTool("cred-1", "search");
        params.setTools(List.of(toolDef));
        Object mcpContext = invokePrefetchMcpTools(params, executionContext);

        List<ObjectNode> messages = new ArrayList<>();
        ObjectNode toolCall = objectMapper.createObjectNode();
        toolCall.put("id", "call-1");
        ObjectNode function = toolCall.putObject("function");
        function.put("name", "server__search");
        function.put("arguments", "{\"query\":\"hello\"}");

        boolean executed = invokeExecuteTools(
                List.of(toolCall),
                List.of(toolDef),
                new WorkflowExecution(),
                executionContext,
                messages,
                mcpContext,
                new int[]{0});

        assertThat(executed).isTrue();
        assertThat(messages).hasSize(1);
        assertThat(messages.get(0).get("content").asText()).contains("found");

        ArgumentCaptor<Map<String, Object>> argsCaptor = ArgumentCaptor.forClass(Map.class);
        verify(mcpToolInvoker).callTool(eq(credential), anyMap(), eq("search"), argsCaptor.capture(), eq(30));
        assertThat(argsCaptor.getValue()).containsEntry("query", "hello");
    }

    @Test
    void executeTools_blocksMcpCallsWhenMaxExceeded() throws Exception {
        ExecutionContext executionContext = context();
        IntegrationCredential credential = new IntegrationCredential();
        credential.setId("cred-1");
        credential.setName("Server");
        credential.setCredentials(Map.of("token", "secret"));

        when(variableResolver.resolveString("cred-1", executionContext)).thenReturn("cred-1");
        when(credentialProvider.resolveCredential("cred-1", null, executionContext)).thenReturn(Optional.of(credential));
        when(mcpToolDiscoveryService.listTools(eq(credential), anyMap())).thenReturn(List.of(
                new McpToolDescriptor("search", "Search docs", Map.of("type", "object"))));

        AgentsTaskParameters params = new AgentsTaskParameters();
        params.setMaxMcpToolCallsPerRun(0);
        AgentsTaskParameters.AgentTool toolDef = mcpTool("cred-1", "search");
        params.setTools(List.of(toolDef));
        Object mcpContext = invokePrefetchMcpTools(params, executionContext);

        List<ObjectNode> messages = new ArrayList<>();
        ObjectNode toolCall = objectMapper.createObjectNode();
        toolCall.put("id", "call-1");
        ObjectNode function = toolCall.putObject("function");
        function.put("name", "server__search");
        function.put("arguments", "{}");

        invokeExecuteTools(
                List.of(toolCall),
                List.of(toolDef),
                new WorkflowExecution(),
                executionContext,
                messages,
                mcpContext,
                new int[]{0});

        assertThat(messages.get(0).get("content").asText())
                .contains("Maximum MCP tool calls per run exceeded");
        verify(mcpToolInvoker, never()).callTool(any(), anyMap(), any(), anyMap(), anyInt());
    }

    @Test
    void agentsExecutionData_includesLoopExhaustionWarningInOutput() {
        AgentsTaskExecutionData data = AgentsTaskExecutionData.builder()
                .loopExhausted(true)
                .warning("Agent loop limit (10) reached while the model requested additional tool calls")
                .generatedText("partial answer")
                .build();

        assertThat(data.toOutputMap())
                .containsEntry("loopExhausted", true)
                .containsEntry("warning", data.getWarning())
                .containsEntry("generatedText", "partial answer");
    }

    @Test
    void prefetchMcpTools_fetchesEachCredentialOnce() throws Exception {
        ExecutionContext executionContext = context();
        IntegrationCredential credential = new IntegrationCredential();
        credential.setId("cred-1");
        credential.setName("Server");
        credential.setCredentials(Map.of("token", "secret"));

        when(variableResolver.resolveString("cred-1", executionContext)).thenReturn("cred-1");
        when(credentialProvider.resolveCredential("cred-1", null, executionContext)).thenReturn(Optional.of(credential));
        when(mcpToolDiscoveryService.listTools(eq(credential), anyMap())).thenReturn(List.of(
                new McpToolDescriptor("search", "Search", Map.of()),
                new McpToolDescriptor("fetch", "Fetch", Map.of())));

        AgentsTaskParameters params = new AgentsTaskParameters();
        params.setTools(List.of(
                mcpTool("cred-1", "search"),
                mcpTool("cred-1", "fetch")));

        Object mcpContext = invokePrefetchMcpTools(params, executionContext);

        Method findRemoteTool = mcpContext.getClass().getDeclaredMethod("findRemoteTool", String.class, String.class);
        findRemoteTool.setAccessible(true);
        Optional<?> remoteTool = (Optional<?>) findRemoteTool.invoke(mcpContext, "cred-1", "search");
        assertThat(remoteTool).isPresent();
        verify(mcpToolDiscoveryService).listTools(eq(credential), anyMap());
    }

    private AgentsTaskParameters.AgentTool mcpTool(String credentialId, String remoteToolName) {
        AgentsTaskParameters.AgentTool tool = new AgentsTaskParameters.AgentTool();
        tool.setSourceType(AgentsTaskParameters.AgentToolSource.MCP);
        tool.setCredentialId(credentialId);
        tool.setRemoteToolName(remoteToolName);
        return tool;
    }

    private ExecutionContext context() {
        WorkflowDefinition definition = new WorkflowDefinition();
        definition.setTasks(List.of());

        WorkflowTask agentTask = new WorkflowTask();
        agentTask.setTaskId("agent-1");
        agentTask.setType(TaskType.AGENTS_TASK);

        return ExecutionContext.builder()
                .workflowExecutionId("exec-1")
                .workflowDefinition(definition)
                .workflowVariables(new HashMap<>())
                .taskOutputs(new HashMap<>())
                .build();
    }

    private boolean invokeExecuteTools(
            List<ObjectNode> toolCalls,
            List<AgentsTaskParameters.AgentTool> toolsDef,
            WorkflowExecution execution,
            ExecutionContext context,
            List<ObjectNode> messages,
            Object mcpContext,
            int[] mcpCallCount) throws Exception {
        Method method = AgentsTaskExecutor.class.getDeclaredMethod(
                "executeTools",
                List.class,
                List.class,
                WorkflowExecution.class,
                ExecutionContext.class,
                List.class,
                Class.forName("com.app.core.executors.AgentsTaskExecutor$McpPrefetchedContext"),
                int[].class);
        method.setAccessible(true);
        return (boolean) method.invoke(
                executor, toolCalls, toolsDef, execution, context, messages, mcpContext, mcpCallCount);
    }

    private Object invokePrefetchMcpTools(AgentsTaskParameters params, ExecutionContext context) throws Exception {
        Method method = AgentsTaskExecutor.class.getDeclaredMethod("prefetchMcpTools", AgentsTaskParameters.class, ExecutionContext.class);
        method.setAccessible(true);
        return method.invoke(executor, params, context);
    }

}
