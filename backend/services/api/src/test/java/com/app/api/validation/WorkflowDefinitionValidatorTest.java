package com.app.api.validation;

import com.app.api.config.properties.WorkflowApiProperties;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.exception.ValidationException;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.entity.IntegrationCredential;
import com.app.common.model.task.parameters.AgentsTaskParameters;
import com.app.common.model.task.parameters.BranchTaskParameters;
import com.app.common.model.task.parameters.HttpTaskParameters;
import com.app.common.model.task.parameters.JoinTaskParameters;
import com.app.common.model.task.parameters.JoinWaitPolicy;
import com.app.common.model.trigger.PollHttpConfig;
import com.app.common.model.trigger.WebhookConfig;
import com.app.common.model.trigger.WebhookInboundConfig;
import com.app.common.model.trigger.WebhookDeliveryMode;
import com.app.common.model.trigger.McpResponseMode;
import com.app.common.model.trigger.McpTriggerConfig;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.persistence.connector.ConnectorRegistry;
import com.app.persistence.repository.IntegrationCredentialRepository;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkflowDefinitionValidatorTest {

    @Mock
    private ConnectorRegistry connectorRegistry;

    @Mock
    private IntegrationCredentialRepository integrationCredentialRepository;

    @Mock
    private WorkflowDefinitionRepository definitionRepository;

    private WorkflowDefinitionValidator validator;

    @BeforeEach
    void setUp() {
        WorkflowApiProperties apiProperties = new WorkflowApiProperties();
        validator = new WorkflowDefinitionValidator(
                connectorRegistry, apiProperties, integrationCredentialRepository, definitionRepository);
    }

    @Test
    void validateBranchJoinTopology_acceptsFlatBranchJoin() {
        WorkflowDefinition definition = flatBranchJoinDefinition();

        assertThatCode(() -> validator.validateBranchJoinTopology(definition)).doesNotThrowAnyException();
    }

    @Test
    void validateBranchJoinTopology_rejectsJoinWithoutInbounds() {
        WorkflowDefinition definition = flatBranchJoinDefinition();
        JoinTaskParameters params = (JoinTaskParameters) findTask(definition, "join_merge").getParameters();
        params.setInboundTaskIds(List.of());

        assertThatThrownBy(() -> validator.validateBranchJoinTopology(definition))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("requires at least one inbound");
    }

    @Test
    void validateBranchJoinTopology_rejectsDuplicateInbound() {
        WorkflowDefinition definition = flatBranchJoinDefinition();
        JoinTaskParameters params = (JoinTaskParameters) findTask(definition, "join_merge").getParameters();
        params.setInboundTaskIds(List.of("task_left", "task_left"));

        assertThatThrownBy(() -> validator.validateBranchJoinTopology(definition))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("duplicate inbound");
    }

    @Test
    void validateBranchJoinTopology_rejectsSelfInbound() {
        WorkflowDefinition definition = flatBranchJoinDefinition();
        JoinTaskParameters params = (JoinTaskParameters) findTask(definition, "join_merge").getParameters();
        params.setInboundTaskIds(List.of("join_merge"));

        assertThatThrownBy(() -> validator.validateBranchJoinTopology(definition))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("cannot reference itself");
    }

    @Test
    void validateBranchJoinTopology_rejectsUnknownInbound() {
        WorkflowDefinition definition = flatBranchJoinDefinition();
        JoinTaskParameters params = (JoinTaskParameters) findTask(definition, "join_merge").getParameters();
        params.setInboundTaskIds(List.of("missing_task"));

        assertThatThrownBy(() -> validator.validateBranchJoinTopology(definition))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("unknown inbound");
    }

    @Test
    void validateBranchJoinTopology_rejectsNonLeafInbound() {
        WorkflowDefinition definition = flatBranchJoinDefinition();
        JoinTaskParameters params = (JoinTaskParameters) findTask(definition, "join_merge").getParameters();
        params.setInboundTaskIds(List.of("branch_split"));

        assertThatThrownBy(() -> validator.validateBranchJoinTopology(definition))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("must be a leaf task");
    }

    @Test
    void validateBranchJoinTopology_rejectsInboundSharedAcrossJoins() {
        WorkflowDefinition definition = flatBranchJoinDefinition();
        WorkflowTask secondJoin = new WorkflowTask();
        secondJoin.setTaskId("join_other");
        secondJoin.setType(TaskType.JOIN);
        secondJoin.setParameters(JoinTaskParameters.builder()
                .inboundTaskIds(List.of("task_left"))
                .waitPolicy(JoinWaitPolicy.ALL)
                .nextTaskId("task_after")
                .build());
        definition.getTasks().add(secondJoin);

        assertThatThrownBy(() -> validator.validateBranchJoinTopology(definition))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("multiple JOIN tasks");
    }

    @Test
    void validateBranchJoinTopology_rejectsInvalidQuorumCount() {
        WorkflowDefinition definition = flatBranchJoinDefinition();
        JoinTaskParameters params = (JoinTaskParameters) findTask(definition, "join_merge").getParameters();
        params.setWaitPolicy(JoinWaitPolicy.QUORUM);
        params.setQuorumCount(3);

        assertThatThrownBy(() -> validator.validateBranchJoinTopology(definition))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("quorumCount");
    }

    @Test
    void validateWebhookSubscribe_rejectsMissingUnsubscribeUrl() {
        WebhookConfig webhook = WebhookConfig.builder()
                .deliveryMode(WebhookDeliveryMode.SUBSCRIBE)
                .active(true)
                .subscribeHttp(PollHttpConfig.builder().url("https://vendor.example.com/subscribe").build())
                .build();

        assertThatThrownBy(() -> validator.validateWebhookSubscribe(webhook))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("unsubscribe HTTP URL");
    }

    @Test
    void validateWebhookSubscribe_rejectsMissingSubscriptionIdPath() {
        WebhookConfig webhook = WebhookConfig.builder()
                .deliveryMode(WebhookDeliveryMode.SUBSCRIBE)
                .active(true)
                .subscribeHttp(PollHttpConfig.builder().url("https://vendor.example.com/subscribe").build())
                .unsubscribeHttp(PollHttpConfig.builder().url("https://vendor.example.com/unsubscribe").build())
                .build();

        assertThatThrownBy(() -> validator.validateWebhookSubscribe(webhook))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("subscriptionIdPath");
    }

    @Test
    void validateAgentsTask_rejectsMcpToolWithoutCredentialId() {
        WorkflowDefinition definition = agentsTaskDefinition(mcpTool(null, "search", null));

        assertThatThrownBy(() -> validator.validate(definition))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("MCP tool requires credentialId");
    }

    @Test
    void validateAgentsTask_rejectsMcpToolWithTargetTaskId() {
        WorkflowDefinition definition = agentsTaskDefinition(mcpTool("cred-1", "search", "task_sub"));

        assertThatThrownBy(() -> validator.validate(definition))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("must not set targetTaskId");
    }

    @Test
    void validateAgentsTask_rejectsTaskToolWithoutTargetTaskId() {
        AgentsTaskParameters.AgentTool tool = new AgentsTaskParameters.AgentTool();
        tool.setName("local_tool");
        WorkflowDefinition definition = agentsTaskDefinition(tool);

        assertThatThrownBy(() -> validator.validate(definition))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("task tool requires targetTaskId");
    }

    @Test
    void validateAgentsTask_rejectsDuplicateLlmToolNames() {
        IntegrationCredential credential = new IntegrationCredential();
        credential.setId("cred-1");
        credential.setName("My Server");
        when(integrationCredentialRepository.findById("cred-1")).thenReturn(Optional.of(credential));

        AgentsTaskParameters.AgentTool first = mcpTool("cred-1", "search", null);
        AgentsTaskParameters.AgentTool second = mcpTool("cred-1", "search", null);
        WorkflowDefinition definition = agentsTaskDefinition(first, second);

        assertThatThrownBy(() -> validator.validate(definition))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("duplicate LLM tool name");
    }

    @Test
    void validateWebhookSubscribe_acceptsSubscribeAndUnsubscribeUrls() {
        WebhookConfig webhook = WebhookConfig.builder()
                .deliveryMode(WebhookDeliveryMode.SUBSCRIBE)
                .active(true)
                .subscribeHttp(PollHttpConfig.builder().url("https://vendor.example.com/subscribe").build())
                .unsubscribeHttp(PollHttpConfig.builder().url("https://vendor.example.com/unsubscribe").build())
                .subscriptionIdPath("$.id")
                .inbound(WebhookInboundConfig.builder()
                        .ignoreDuplicates(false)
                        .build())
                .build();

        assertThatCode(() -> validator.validateWebhookSubscribe(webhook)).doesNotThrowAnyException();
    }

    private static AgentsTaskParameters.AgentTool mcpTool(String credentialId, String remoteToolName, String targetTaskId) {
        AgentsTaskParameters.AgentTool tool = new AgentsTaskParameters.AgentTool();
        tool.setSourceType(AgentsTaskParameters.AgentToolSource.MCP);
        tool.setCredentialId(credentialId);
        tool.setRemoteToolName(remoteToolName);
        tool.setTargetTaskId(targetTaskId);
        return tool;
    }

    private static WorkflowDefinition agentsTaskDefinition(AgentsTaskParameters.AgentTool... tools) {
        AgentsTaskParameters params = new AgentsTaskParameters();
        params.setModel("gpt-4");
        params.setTools(List.of(tools));

        WorkflowDefinition definition = new WorkflowDefinition();
        definition.setName("agents-workflow");
        definition.setTasks(List.of(task("agent_1", TaskType.AGENTS_TASK, params, null)));
        return definition;
    }

    private static WorkflowDefinition flatBranchJoinDefinition() {
        WorkflowDefinition definition = new WorkflowDefinition();
        definition.setName("flat-branch-join");

        BranchTaskParameters branchParams = new BranchTaskParameters();
        branchParams.setBranches(List.of(
                branchRow("Left", "task_left"),
                branchRow("Right", "task_right")));

        List<WorkflowTask> tasks = new ArrayList<>();
        tasks.add(task("branch_split", TaskType.BRANCH, branchParams, "join_merge"));
        tasks.add(task("task_left", TaskType.HTTP_TASK, new HttpTaskParameters(), null));
        tasks.add(task("task_right", TaskType.HTTP_TASK, new HttpTaskParameters(), null));
        tasks.add(task("join_merge", TaskType.JOIN, JoinTaskParameters.builder()
                .inboundTaskIds(List.of("task_left", "task_right"))
                .waitPolicy(JoinWaitPolicy.ALL)
                .nextTaskId("task_after")
                .build(), "task_after"));
        tasks.add(task("task_after", TaskType.HTTP_TASK, new HttpTaskParameters(), null));
        definition.setTasks(tasks);
        return definition;
    }

    private static BranchTaskParameters.ParallelBranch branchRow(String name, String startTaskId) {
        BranchTaskParameters.ParallelBranch row = new BranchTaskParameters.ParallelBranch();
        row.setBranchName(name);
        row.setStartTaskId(startTaskId);
        return row;
    }

    private static WorkflowTask task(
            String taskId,
            TaskType type,
            Object parameters,
            String nextTaskId) {
        WorkflowTask task = new WorkflowTask();
        task.setTaskId(taskId);
        task.setType(type);
        task.setParameters((com.app.common.model.task.parameters.TaskParameters) parameters);
        task.setNextTaskId(nextTaskId);
        return task;
    }

    private static WorkflowTask findTask(WorkflowDefinition definition, String taskId) {
        return definition.getTasks().stream()
                .filter(task -> taskId.equals(task.getTaskId()))
                .findFirst()
                .orElseThrow();
    }

    @Test
    void validateMcpTrigger_requiresToolNameWhenActive() {
        WorkflowDefinition definition = minimalDefinition();
        definition.setTrigger(TriggerConfig.builder()
                .type(TriggerType.MCP)
                .mcp(McpTriggerConfig.builder().active(true).build())
                .build());

        assertThatThrownBy(() -> validator.validateMcpTrigger(definition, definition.getTrigger().getMcp()))
                .isInstanceOf(com.app.common.exception.ValidationException.class)
                .hasMessageContaining("toolName");
    }

    @Test
    void validateMcpTrigger_rejectsDuplicateToolName() {
        WorkflowDefinition current = minimalDefinition();
        current.setId("wf-1");
        current.setTrigger(TriggerConfig.builder()
                .type(TriggerType.MCP)
                .mcp(McpTriggerConfig.builder().toolName("shared_tool").active(true).build())
                .build());

        WorkflowDefinition other = minimalDefinition();
        other.setId("wf-2");
        other.setTrigger(TriggerConfig.builder()
                .type(TriggerType.MCP)
                .mcp(McpTriggerConfig.builder().toolName("shared_tool").active(true).build())
                .build());

        when(definitionRepository.findAll()).thenReturn(List.of(current, other));

        assertThatThrownBy(() -> validator.validateMcpTrigger(current, current.getTrigger().getMcp()))
                .isInstanceOf(com.app.common.exception.ValidationException.class)
                .hasMessageContaining("unique");
    }

    @Test
    void validateMcpTrigger_requiresResponseTaskForTaskOutputMode() {
        WorkflowDefinition definition = minimalDefinition();
        definition.setTrigger(TriggerConfig.builder()
                .type(TriggerType.MCP)
                .mcp(McpTriggerConfig.builder()
                        .toolName("my_tool")
                        .active(true)
                        .responseMode(McpResponseMode.TASK_OUTPUT)
                        .build())
                .build());

        assertThatThrownBy(() -> validator.validateMcpTrigger(definition, definition.getTrigger().getMcp()))
                .isInstanceOf(com.app.common.exception.ValidationException.class)
                .hasMessageContaining("responseTaskId");
    }

    private static WorkflowDefinition minimalDefinition() {
        WorkflowDefinition definition = new WorkflowDefinition();
        definition.setName("Test");
        definition.setTasks(List.of(task("task_1", TaskType.HTTP_TASK, new HttpTaskParameters(), null)));
        return definition;
    }
}
