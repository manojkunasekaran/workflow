package com.app.core.executors;

import com.app.common.constant.TaskExecutionStatus;
import com.app.common.constant.WorkflowExecutionStatus;
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
import com.app.core.service.WorkflowEngine;
import com.app.persistence.repository.WorkflowExecutionRepository;
import com.app.persistence.repository.WorkflowTaskExecutionRepository;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;

/**
 * Executor for HUMAN_TASK type.
 * Handles both initial execution (pauses workflow) and response processing
 * (resumes workflow).
 */
@Slf4j
@Component
public class HumanTaskExecutor implements TaskExecutor {

    private final WorkflowEngine workflowEngine;
    private final WorkflowDefinitionRepository definitionRepository;
    private final WorkflowExecutionRepository executionRepository;
    private final WorkflowTaskExecutionRepository taskExecutionRepository;

    public HumanTaskExecutor(@Lazy WorkflowEngine workflowEngine,
            WorkflowDefinitionRepository definitionRepository,
            WorkflowExecutionRepository executionRepository,
            WorkflowTaskExecutionRepository taskExecutionRepository) {
        this.workflowEngine = workflowEngine;
        this.definitionRepository = definitionRepository;
        this.executionRepository = executionRepository;
        this.taskExecutionRepository = taskExecutionRepository;
    }

    @Override
    public boolean canExecute(TaskType taskType) {
        return taskType == TaskType.HUMAN_TASK;
    }

    /**
     * Initial execution — pauses the workflow and waits for human input.
     */
    @Override
    public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution,
            ExecutionContext context) {
        HumanTaskParameters params = (HumanTaskParameters) task.getParameters();

        log.info("Human task '{}' requires input. Assignee: {}, Actions: {}",
                params.getTitle(),
                params.getAssignee(),
                params.getActions().stream().map(HumanTaskAction::getId).toList());

        HumanTaskExecutionData executionData = HumanTaskExecutionData.builder()
                .title(params.getTitle())
                .assignee(params.getAssignee())
                .availableActions(params.getActions())
                .currentOutcome(null) // null = TODO state
                .build();

        return TaskExecutionResult.builder()
                .status(TaskExecutionResult.Status.PAUSED)
                .executionData(executionData)
                .output(buildOutput(executionData))
                .build();
    }

    /**
     * Process a human task response.
     * Validates the action, updates task execution data, and resumes the workflow
     * on terminal outcomes (APPROVED/REJECTED).
     */
    public WorkflowTaskExecution respond(String executionId, String taskExecutionId,
            String actionId, String respondedBy, Map<String, Object> formData) {

        // ── Validate ──
        WorkflowTaskExecution taskExecution = taskExecutionRepository.findById(taskExecutionId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowTaskExecution", taskExecutionId));

        if (!taskExecution.getWorkflowExecutionId().equals(executionId)) {
            throw new ValidationException("Task execution does not belong to execution: " + executionId);
        }
        if (!"HUMAN_TASK".equals(taskExecution.getTaskType())) {
            throw new ValidationException("Task is not a HUMAN_TASK");
        }
        if (!TaskExecutionStatus.PAUSED.equals(taskExecution.getStatus())) {
            throw new ValidationException(
                    "Task is not in PAUSED status, current: " + taskExecution.getStatus());
        }
        if (!(taskExecution.getExecutionData() instanceof HumanTaskExecutionData executionData)) {
            throw new ValidationException("Task execution data is invalid");
        }

        HumanTaskAction action = executionData.getAvailableActions().stream()
                .filter(a -> a.getId().equals(actionId))
                .findFirst()
                .orElseThrow(() -> new ValidationException("Invalid actionId: " + actionId));

        // ── Update execution data ──
        executionData.setActionTaken(action.getId());
        executionData.setCurrentOutcome(action.getOutcome());
        executionData.setRespondedBy(respondedBy);
        executionData.setRespondedAt(Instant.now());
        if (formData != null) {
            executionData.setFormData(formData);
        }

        taskExecution.setStatus(mapOutcomeToStatus(action.getOutcome()));
        if (action.getOutcome() != HumanTaskOutcome.PENDING) {
            taskExecution.setEndTime(Instant.now());
        }

        taskExecution.setExecutionData(executionData);
        taskExecution = taskExecutionRepository.save(taskExecution);

        log.info("Human task '{}' responded: action='{}', outcome={}",
                taskExecutionId, actionId, action.getOutcome());

        // ── Resume workflow on terminal outcomes ──
        if (action.getOutcome() == HumanTaskOutcome.APPROVED
                || action.getOutcome() == HumanTaskOutcome.REJECTED) {
            handleWorkflowResume(taskExecution, action, executionData);
        }

        return taskExecution;
    }

    // ── Private helpers ──

    private void handleWorkflowResume(WorkflowTaskExecution taskExecution,
            HumanTaskAction action, HumanTaskExecutionData executionData) {

        WorkflowExecution execution = executionRepository
                .findById(taskExecution.getWorkflowExecutionId()).orElseThrow();

        WorkflowDefinition definition = definitionRepository
                .findById(execution.getWorkflowDefinitionId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "WorkflowDefinition", execution.getWorkflowDefinitionId()));

        // Resolve next task: action override > parameter default > engine default
        // (sequential)
        String nextTaskId = resolveNextTaskId(action, definition, taskExecution.getTaskDefinitionId());
        if (nextTaskId != null) {
            execution.setCurrentTaskId(nextTaskId);
            executionRepository.save(execution);
        }

        if (action.getOutcome() == HumanTaskOutcome.REJECTED
                && nextTaskId == null && execution.getCurrentTaskId() == null) {
            execution.setStatus(WorkflowExecutionStatus.FAILED);
            execution.setEndTime(Instant.now());
            executionRepository.save(execution);
            log.info("Workflow {} failed: human task rejected with no rejection path", execution.getId());
            return;
        }

        Map<String, Object> taskOutput = Map.of(
                taskExecution.getTaskDefinitionId(), executionData.toOutputMap());

        // Engine handles async internally
        workflowEngine.resumeWorkflow(execution.getId(), definition, taskOutput);
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

        return null;
    }

    private TaskExecutionStatus mapOutcomeToStatus(HumanTaskOutcome outcome) {
        return switch (outcome) {
            case APPROVED -> TaskExecutionStatus.COMPLETED;
            case REJECTED -> TaskExecutionStatus.FAILED;
            case PENDING -> TaskExecutionStatus.PAUSED;
        };
    }
}
