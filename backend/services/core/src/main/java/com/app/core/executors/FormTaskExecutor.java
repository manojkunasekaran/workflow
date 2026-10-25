package com.app.core.executors;

import com.app.common.constant.TaskExecutionStatus;
import com.app.common.entity.WorkflowExecution;
import com.app.common.entity.WorkflowTaskExecution;
import com.app.common.model.form.FormPageDefinition;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.FormExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.FormTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.service.TaskExecutor;
import com.app.persistence.repository.WorkflowTaskExecutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class FormTaskExecutor implements TaskExecutor {

    private final WorkflowTaskExecutionRepository taskExecutionRepository;

    @Override
    public boolean canExecute(TaskType taskType) {
        return taskType == TaskType.FORM;
    }

    @Override
    public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
        if (!(task.getParameters() instanceof FormTaskParameters params)) {
            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.FAILED)
                    .errorMessage("Invalid FORM parameters")
                    .build();
        }

        Optional<WorkflowTaskExecution> submitted = findSubmittedStep(execution.getId(), task.getTaskId());
        if (submitted.isPresent()) {
            return buildCompletedResult(submitted.get(), params);
        }
        return pauseForInput(params);
    }

    private TaskExecutionResult pauseForInput(FormTaskParameters params) {
        if (params.getPage() == null) {
            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.FAILED)
                    .errorMessage("FORM requires page schema")
                    .build();
        }
        FormPageDefinition page = params.getPage().firstPage();
        if (page == null || page.getFields() == null || page.getFields().isEmpty()) {
            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.FAILED)
                    .errorMessage("FORM requires at least one field")
                    .build();
        }

        FormExecutionData data = FormExecutionData.builder()
                .pageSchema(params.getPage())
                .submitted(false)
                .build();

        return TaskExecutionResult.builder()
                .status(TaskExecutionResult.Status.PAUSED)
                .executionData(data)
                .output(new HashMap<>())
                .build();
    }

    private TaskExecutionResult buildCompletedResult(
            WorkflowTaskExecution taskExecution,
            FormTaskParameters params) {
        if (!(taskExecution.getExecutionData() instanceof FormExecutionData data) || !data.isSubmitted()) {
            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.FAILED)
                    .errorMessage("Form step was not submitted")
                    .build();
        }

        Map<String, Object> output = new HashMap<>();
        if (data.getAnswers() != null) {
            output.putAll(data.getAnswers());
        }

        if (params.getEndType() != null) {
            data.setEndType(params.getEndType());
            data.setMessage(params.getMessage());
            data.setRedirectUrl(params.getRedirectUrl());
            data.setCustomHtml(params.getCustomHtml());

            output.put("formEndType", params.getEndType().name());
            if (params.getMessage() != null) {
                output.put("message", params.getMessage());
            }
            if (params.getRedirectUrl() != null) {
                output.put("redirectUrl", params.getRedirectUrl());
            }
        }

        return TaskExecutionResult.builder()
                .status(TaskExecutionResult.Status.COMPLETED)
                .executionData(data)
                .output(output)
                .build();
    }

    private Optional<WorkflowTaskExecution> findSubmittedStep(String executionId, String taskDefinitionId) {
        return taskExecutionRepository.findAllByWorkflowExecutionId(executionId).stream()
                .filter(te -> taskDefinitionId.equals(te.getTaskDefinitionId()))
                .filter(te -> "FORM".equals(te.getTaskType()))
                .filter(te -> TaskExecutionStatus.COMPLETED.equals(te.getStatus()))
                .filter(te -> te.getExecutionData() instanceof FormExecutionData d && d.isSubmitted())
                .max(Comparator.comparing(WorkflowTaskExecution::getEndTime, Comparator.nullsLast(Comparator.naturalOrder())));
    }
}
