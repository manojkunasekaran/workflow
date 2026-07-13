package com.app.api.service;

import com.app.common.constant.TaskExecutionStatus;
import com.app.common.entity.WorkflowTaskExecution;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.exception.ValidationException;
import com.app.common.model.task.HumanTaskAction;
import com.app.common.model.task.HumanTaskOutcome;
import com.app.common.model.task.execution.HumanTaskExecutionData;
import com.app.persistence.repository.WorkflowTaskExecutionRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

/**
 * Records a human task response on the task execution document only.
 * Workflow continuation is handled by core after the API queues the execution.
 */
@Service
@RequiredArgsConstructor
public class HumanTaskResponseService {

    private final WorkflowTaskExecutionRepository taskExecutionRepository;

    public WorkflowTaskExecution recordResponse(
            String executionId,
            String taskExecutionId,
            String actionId,
            String respondedBy,
            Map<String, Object> formData) {

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
        return taskExecutionRepository.save(taskExecution);
    }

    public boolean isTerminalOutcome(WorkflowTaskExecution taskExecution) {
        if (!(taskExecution.getExecutionData() instanceof HumanTaskExecutionData data)) {
            return false;
        }
        HumanTaskOutcome outcome = data.getCurrentOutcome();
        return outcome == HumanTaskOutcome.APPROVED || outcome == HumanTaskOutcome.REJECTED;
    }

    private TaskExecutionStatus mapOutcomeToStatus(HumanTaskOutcome outcome) {
        return switch (outcome) {
            case APPROVED -> TaskExecutionStatus.COMPLETED;
            case REJECTED -> TaskExecutionStatus.FAILED;
            case PENDING -> TaskExecutionStatus.PAUSED;
        };
    }
}
