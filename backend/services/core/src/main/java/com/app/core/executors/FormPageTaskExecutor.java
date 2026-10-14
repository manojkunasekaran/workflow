package com.app.core.executors;

import com.app.common.constant.TaskExecutionStatus;
import com.app.common.entity.WorkflowExecution;
import com.app.common.entity.WorkflowTaskExecution;
import com.app.common.model.form.FormAnswerValidator;
import com.app.common.model.form.FormPageDefinition;
import com.app.common.model.form.FormSchema;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.FormPageExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.FormPageTaskParameters;
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
public class FormPageTaskExecutor implements TaskExecutor {

    private final WorkflowTaskExecutionRepository taskExecutionRepository;

    @Override
    public boolean canExecute(TaskType taskType) {
        return taskType == TaskType.FORM_PAGE;
    }

    @Override
    public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
        Optional<WorkflowTaskExecution> submitted = findSubmittedStep(execution.getId(), task.getTaskId());
        if (submitted.isPresent()) {
            return buildCompletedResult(submitted.get(), task);
        }
        return pauseForInput(task);
    }

    private TaskExecutionResult pauseForInput(WorkflowTask task) {
        if (!(task.getParameters() instanceof FormPageTaskParameters params) || params.getPage() == null) {
            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.FAILED)
                    .errorMessage("FORM_PAGE requires page schema")
                    .build();
        }
        FormPageDefinition page = params.getPage().firstPage();
        if (page == null || page.getFields() == null || page.getFields().isEmpty()) {
            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.FAILED)
                    .errorMessage("FORM_PAGE requires at least one field")
                    .build();
        }

        FormPageExecutionData data = FormPageExecutionData.builder()
                .pageSchema(params.getPage())
                .submitted(false)
                .build();

        return TaskExecutionResult.builder()
                .status(TaskExecutionResult.Status.PAUSED)
                .executionData(data)
                .output(new HashMap<>())
                .build();
    }

    private TaskExecutionResult buildCompletedResult(WorkflowTaskExecution taskExecution, WorkflowTask task) {
        if (!(taskExecution.getExecutionData() instanceof FormPageExecutionData data) || !data.isSubmitted()) {
            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.FAILED)
                    .errorMessage("Form page was not submitted")
                    .build();
        }
        Map<String, Object> output = data.getAnswers() != null ? new HashMap<>(data.getAnswers()) : new HashMap<>();
        return TaskExecutionResult.builder()
                .status(TaskExecutionResult.Status.COMPLETED)
                .executionData(data)
                .output(output)
                .build();
    }

    private Optional<WorkflowTaskExecution> findSubmittedStep(String executionId, String taskDefinitionId) {
        return taskExecutionRepository.findAllByWorkflowExecutionId(executionId).stream()
                .filter(te -> taskDefinitionId.equals(te.getTaskDefinitionId()))
                .filter(te -> "FORM_PAGE".equals(te.getTaskType()))
                .filter(te -> TaskExecutionStatus.COMPLETED.equals(te.getStatus()))
                .filter(te -> te.getExecutionData() instanceof FormPageExecutionData d && d.isSubmitted())
                .max(Comparator.comparing(WorkflowTaskExecution::getEndTime, Comparator.nullsLast(Comparator.naturalOrder())));
    }
}
