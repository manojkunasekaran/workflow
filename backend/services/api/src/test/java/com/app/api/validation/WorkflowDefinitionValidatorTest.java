package com.app.api.validation;

import com.app.api.config.properties.WorkflowApiProperties;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.exception.ValidationException;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.parameters.BranchTaskParameters;
import com.app.common.model.task.parameters.HttpTaskParameters;
import com.app.common.model.task.parameters.JoinTaskParameters;
import com.app.common.model.task.parameters.JoinWaitPolicy;
import com.app.common.model.trigger.PollHttpConfig;
import com.app.common.model.trigger.WebhookConfig;
import com.app.common.model.trigger.WebhookInboundConfig;
import com.app.common.model.trigger.WebhookDeliveryMode;
import com.app.persistence.connector.ConnectorRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(MockitoExtension.class)
class WorkflowDefinitionValidatorTest {

    @Mock
    private ConnectorRegistry connectorRegistry;

    private WorkflowDefinitionValidator validator;

    @BeforeEach
    void setUp() {
        WorkflowApiProperties apiProperties = new WorkflowApiProperties();
        validator = new WorkflowDefinitionValidator(connectorRegistry, apiProperties);
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
}
