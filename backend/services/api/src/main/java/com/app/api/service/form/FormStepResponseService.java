package com.app.api.service.form;

import com.app.common.constant.TaskExecutionStatus;
import com.app.common.entity.WorkflowTaskExecution;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.exception.ValidationException;
import com.app.common.model.form.FormAnswerValidator;
import com.app.common.model.form.FormPageDefinition;
import com.app.common.model.task.execution.FormExecutionData;
import com.app.persistence.repository.WorkflowTaskExecutionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class FormStepResponseService {

    private final WorkflowTaskExecutionRepository taskExecutionRepository;

    public WorkflowTaskExecution recordFormPageSubmission(
            String executionId,
            String taskExecutionId,
            FormPageDefinition page,
            Map<String, Object> answers) {

        FormAnswerValidator.validatePage(page, answers);

        WorkflowTaskExecution taskExecution = taskExecutionRepository.findById(taskExecutionId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowTaskExecution", taskExecutionId));

        if (!taskExecution.getWorkflowExecutionId().equals(executionId)) {
            throw new ValidationException("Task execution does not belong to execution: " + executionId);
        }
        if (!"FORM".equals(taskExecution.getTaskType())) {
            throw new ValidationException("Task is not a FORM");
        }
        if (!TaskExecutionStatus.PAUSED.equals(taskExecution.getStatus())) {
            throw new ValidationException(
                    "Task is not in PAUSED status, current: " + taskExecution.getStatus());
        }
        if (!(taskExecution.getExecutionData() instanceof FormExecutionData executionData)) {
            throw new ValidationException("Task execution data is invalid");
        }

        executionData.setAnswers(answers);
        executionData.setSubmitted(true);
        executionData.setSubmittedAt(Instant.now());
        taskExecution.setExecutionData(executionData);
        taskExecution.setStatus(TaskExecutionStatus.COMPLETED);
        taskExecution.setEndTime(Instant.now());
        return taskExecutionRepository.save(taskExecution);
    }
}
