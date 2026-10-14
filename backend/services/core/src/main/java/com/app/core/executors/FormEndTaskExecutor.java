package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.FormEndExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.FormEndTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.service.TaskExecutor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
public class FormEndTaskExecutor implements TaskExecutor {

    @Override
    public boolean canExecute(TaskType taskType) {
        return taskType == TaskType.FORM_END;
    }

    @Override
    public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
        if (!(task.getParameters() instanceof FormEndTaskParameters params)) {
            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.FAILED)
                    .errorMessage("Invalid FORM_END parameters")
                    .build();
        }

        FormEndTaskParameters.EndType endType =
                params.getEndType() != null ? params.getEndType() : FormEndTaskParameters.EndType.MESSAGE;

        FormEndExecutionData data = FormEndExecutionData.builder()
                .endType(endType)
                .message(params.getMessage())
                .redirectUrl(params.getRedirectUrl())
                .customHtml(params.getCustomHtml())
                .build();

        Map<String, Object> output = new HashMap<>();
        output.put("formEndType", endType.name());
        if (params.getMessage() != null) {
            output.put("message", params.getMessage());
        }
        if (params.getRedirectUrl() != null) {
            output.put("redirectUrl", params.getRedirectUrl());
        }

        TaskExecutionResult.Status status = params.isContinueWorkflowAfterEnd()
                ? TaskExecutionResult.Status.COMPLETED
                : TaskExecutionResult.Status.PAUSED;

        return TaskExecutionResult.builder()
                .status(status)
                .executionData(data)
                .output(output)
                .build();
    }
}
