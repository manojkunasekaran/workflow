package com.app.core.executors;

import com.app.common.constant.TaskExecutionStatus;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.entity.WorkflowExecution;
import com.app.common.entity.WorkflowTaskExecution;
import com.app.common.model.task.HumanTaskAction;
import com.app.common.model.task.HumanTaskOutcome;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.HumanTaskExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.HumanTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import com.app.persistence.repository.WorkflowTaskExecutionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HumanTaskExecutorTest {

    @Mock
    private WorkflowDefinitionRepository definitionRepository;
    @Mock
    private WorkflowTaskExecutionRepository taskExecutionRepository;

    private HumanTaskExecutor executor;
    private WorkflowTask task;
    private HumanTaskParameters params;
    private ExecutionContext context;
    private WorkflowExecution execution;

    @BeforeEach
    void setUp() {
        executor = new HumanTaskExecutor(definitionRepository, taskExecutionRepository);

        HumanTaskAction approve = new HumanTaskAction();
        approve.setId("approve");
        approve.setLabel("Approve");
        approve.setOutcome(HumanTaskOutcome.APPROVED);
        approve.setNextTaskId("next_task");

        params = new HumanTaskParameters();
        params.setTitle("Review request");
        params.setAssignee("reviewer@example.com");
        params.setActions(List.of(approve));

        task = new WorkflowTask();
        task.setTaskId("human_1");
        task.setType(TaskType.HUMAN_TASK);
        task.setParameters(params);

        context = ExecutionContext.builder().build();
        execution = new WorkflowExecution();
        execution.setId("exec-1");
        execution.setWorkflowDefinitionId("def-1");
    }

    @Test
    void execute_initialRunPausesWorkflow() {
        when(taskExecutionRepository.findAllByWorkflowExecutionId("exec-1")).thenReturn(List.of());

        TaskExecutionResult result = executor.execute(task, execution, context);

        assertEquals(TaskExecutionResult.Status.PAUSED, result.getStatus());
        HumanTaskExecutionData data = (HumanTaskExecutionData) result.getExecutionData();
        assertEquals("Review request", data.getTitle());
        assertEquals(1, data.getAvailableActions().size());
    }

    @Test
    void execute_reEntryAfterResponseCompletesWithRouting() {
        HumanTaskExecutionData respondedData = HumanTaskExecutionData.builder()
                .title("Review request")
                .availableActions(params.getActions())
                .currentOutcome(HumanTaskOutcome.APPROVED)
                .actionTaken("approve")
                .respondedBy("user@example.com")
                .respondedAt(Instant.parse("2026-01-01T00:00:00Z"))
                .build();

        WorkflowTaskExecution prior = new WorkflowTaskExecution();
        prior.setTaskType("HUMAN_TASK");
        prior.setTaskDefinitionId("human_1");
        prior.setStatus(TaskExecutionStatus.COMPLETED);
        prior.setEndTime(Instant.parse("2026-01-01T00:00:00Z"));
        prior.setExecutionData(respondedData);

        WorkflowDefinition definition = new WorkflowDefinition();
        definition.setId("def-1");
        definition.setTasks(List.of(task));

        when(taskExecutionRepository.findAllByWorkflowExecutionId("exec-1")).thenReturn(List.of(prior));
        when(definitionRepository.findById("def-1")).thenReturn(Optional.of(definition));

        TaskExecutionResult result = executor.execute(task, execution, context);

        assertEquals(TaskExecutionResult.Status.COMPLETED, result.getStatus());
        assertEquals("next_task", result.getNextTaskId());
    }

    @Test
    void execute_emptyActionsReturnsFailed() {
        params.setActions(List.of());
        when(taskExecutionRepository.findAllByWorkflowExecutionId("exec-1")).thenReturn(List.of());

        TaskExecutionResult result = executor.execute(task, execution, context);

        assertEquals(TaskExecutionResult.Status.FAILED, result.getStatus());
        assertTrue(result.getErrorMessage().contains("at least one action"));
    }

    @Test
    void canExecute_onlyHumanTask() {
        assertTrue(executor.canExecute(TaskType.HUMAN_TASK));
        assertTrue(!executor.canExecute(TaskType.HTTP_TASK));
    }
}
