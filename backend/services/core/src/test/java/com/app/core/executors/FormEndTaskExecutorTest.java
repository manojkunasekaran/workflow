package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.FormEndExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.FormEndTaskParameters;
import com.app.core.model.ExecutionContext;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FormEndTaskExecutorTest {

    private final FormEndTaskExecutor executor = new FormEndTaskExecutor();

    @Test
    void completesWhenWorkflowShouldContinue() {
        WorkflowTask task = taskWith(params(FormEndTaskParameters.EndType.MESSAGE, true));
        TaskExecutionResult result = executor.execute(task, new WorkflowExecution(), ExecutionContext.builder().build());
        assertEquals(TaskExecutionResult.Status.COMPLETED, result.getStatus());
        assertTrue(result.getExecutionData() instanceof FormEndExecutionData);
    }

    @Test
    void pausesWhenWorkflowShouldStopAfterForm() {
        FormEndTaskParameters params = params(FormEndTaskParameters.EndType.REDIRECT, false);
        params.setRedirectUrl("https://example.com");
        WorkflowTask task = taskWith(params);
        TaskExecutionResult result = executor.execute(task, new WorkflowExecution(), ExecutionContext.builder().build());
        assertEquals(TaskExecutionResult.Status.PAUSED, result.getStatus());
    }

    private static FormEndTaskParameters params(FormEndTaskParameters.EndType endType, boolean continueAfter) {
        FormEndTaskParameters params = new FormEndTaskParameters();
        params.setEndType(endType);
        params.setMessage("Thanks");
        params.setContinueWorkflowAfterEnd(continueAfter);
        return params;
    }

    private static WorkflowTask taskWith(FormEndTaskParameters params) {
        WorkflowTask task = new WorkflowTask();
        task.setTaskId("form_end");
        task.setType(TaskType.FORM_END);
        task.setParameters(params);
        return task;
    }
}
