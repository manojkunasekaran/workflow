package com.app.core.executors;

import com.app.common.constant.TaskExecutionStatus;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.entity.WorkflowExecution;
import com.app.common.entity.WorkflowTaskExecution;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.exception.ValidationException;
import com.app.common.model.task.HumanTaskAction;
import com.app.common.model.task.HumanTaskOutcome;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.HumanTaskExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.HumanTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.service.TaskExecutor;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import com.app.persistence.repository.WorkflowTaskExecutionRepository;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Executor for HUMAN_TASK type.
 * Handles both initial execution (pauses workflow) and re-entry after the API
 * records a human response (returns COMPLETED with resolved routing).
 */
@Slf4j
@Component
public class HumanTaskExecutor implements TaskExecutor {

    private final WorkflowDefinitionRepository definitionRepository;
    private final WorkflowTaskExecutionRepository taskExecutionRepository;

    public HumanTaskExecutor(WorkflowDefinitionRepository definitionRepository,
            WorkflowTaskExecutionRepository taskExecutionRepository) {
        this.definitionRepository = definitionRepository;
        this.taskExecutionRepository = taskExecutionRepository;
    }

    @Override
    public boolean canExecute(TaskType taskType) {
        return taskType == TaskType.HUMAN_TASK;
    }

    /**
     * Initial execution pauses the workflow. On re-entry after an API response,
     * resolves routing and returns COMPLETED so the engine can advance.
     */
    @Override
    public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution,
            ExecutionContext context) {
        Optional<WorkflowTaskExecution> responded = findRespondedHumanTaskExecution(
                execution.getId(), task.getTaskId());

        if (responded.isPresent()) {
            return buildResultFromResponse(responded.get(), task, execution);
        }

        return pauseForHumanInput(task);
    }

    /**
     * Initial execution — pauses the workflow and waits for human input.
     */
    private TaskExecutionResult pauseForHumanInput(WorkflowTask task) {
        HumanTaskParameters params = (HumanTaskParameters) task.getParameters();

        log.info("Human task '{}' requires input. Assignee: {}, Actions: {}",
                params.getTitle(),
                params.getAssignee(),
                params.getActions().stream().map(HumanTaskAction::getId).toList());

        HumanTaskExecutionData executionData = HumanTaskExecutionData.builder()
                .title(params.getTitle())
                .assignee(params.getAssignee())
                .availableActions(params.getActions())
                .currentOutcome(null)
                .build();

        return TaskExecutionResult.builder()
                .status(TaskExecutionResult.Status.PAUSED)
                .executionData(executionData)
                .output(buildOutput(executionData))
                .build();
    }

    /**
     * Re-entry after the API recorded a terminal human response.
     * Resolves the next task (core routing) and returns a result the engine loop
     * can act on without any task-type logic in WorkflowEngine.
     */
    private TaskExecutionResult buildResultFromResponse(WorkflowTaskExecution taskExecution,
            WorkflowTask task, WorkflowExecution execution) {

        if (!(taskExecution.getExecutionData() instanceof HumanTaskExecutionData executionData)) {
            throw new ValidationException("Human task execution data is invalid");
        }

        HumanTaskOutcome outcome = executionData.getCurrentOutcome();
        if (outcome == null || outcome == HumanTaskOutcome.PENDING) {
            throw new ValidationException("Human task has not been responded to yet");
        }

        WorkflowDefinition definition = definitionRepository.findById(execution.getWorkflowDefinitionId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "WorkflowDefinition", execution.getWorkflowDefinitionId()));

        HumanTaskAction action = executionData.getAvailableActions().stream()
                .filter(a -> a.getId().equals(executionData.getActionTaken()))
                .findFirst()
                .orElseThrow(() -> new ValidationException("Human task action not found"));

        String resolvedNextTaskId = resolveNextTaskId(action, definition, task.getTaskId());

        log.info("Human task '{}' re-entry: outcome={}, nextTask={}",
                task.getTaskId(), outcome, resolvedNextTaskId);

        if (outcome == HumanTaskOutcome.REJECTED && resolvedNextTaskId == null) {
            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.FAILED)
                    .executionData(executionData)
                    .output(buildOutput(executionData))
                    .errorMessage("Human task rejected with no rejection path")
                    .build();
        }

        return TaskExecutionResult.builder()
                .status(TaskExecutionResult.Status.COMPLETED)
                .nextTaskId(resolvedNextTaskId)
                .executionData(executionData)
                .output(buildOutput(executionData))
                .build();
    }

    private Optional<WorkflowTaskExecution> findRespondedHumanTaskExecution(
            String executionId, String taskDefinitionId) {
        return taskExecutionRepository.findAllByWorkflowExecutionId(executionId).stream()
                .filter(t -> "HUMAN_TASK".equals(t.getTaskType()))
                .filter(t -> taskDefinitionId.equals(t.getTaskDefinitionId()))
                .filter(t -> TaskExecutionStatus.COMPLETED.equals(t.getStatus())
                        || TaskExecutionStatus.FAILED.equals(t.getStatus()))
                .max(Comparator.comparing(WorkflowTaskExecution::getEndTime,
                        Comparator.nullsLast(Comparator.naturalOrder())));
    }

    private String resolveNextTaskId(HumanTaskAction action, WorkflowDefinition definition,
            String currentTaskId) {
        if (action.getNextTaskId() != null) {
            return action.getNextTaskId();
        }

        WorkflowTask task = definition.getTasks().stream()
                .filter(t -> t.getTaskId().equals(currentTaskId))
                .findFirst()
                .orElse(null);

        if (task != null && task.getParameters() instanceof HumanTaskParameters params) {
            if (action.getOutcome() == HumanTaskOutcome.APPROVED && params.getApprovedNextTaskId() != null) {
                return params.getApprovedNextTaskId();
            }
            if (action.getOutcome() == HumanTaskOutcome.REJECTED && params.getRejectedNextTaskId() != null) {
                return params.getRejectedNextTaskId();
            }
        }

        if (definition.getTasks() != null) {
            return sequentialNextTaskId(definition.getTasks(), currentTaskId);
        }
        return null;
    }

    private String sequentialNextTaskId(List<WorkflowTask> tasks, String currentTaskId) {
        for (int i = 0; i < tasks.size() - 1; i++) {
            if (tasks.get(i).getTaskId().equals(currentTaskId)) {
                return tasks.get(i + 1).getTaskId();
            }
        }
        return null;
    }
}
