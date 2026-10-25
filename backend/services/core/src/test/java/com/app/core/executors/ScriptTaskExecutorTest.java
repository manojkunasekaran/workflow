package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.HttpTaskParameters;
import com.app.common.model.task.parameters.ScriptTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.service.ScriptEvaluationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ScriptTaskExecutorTest {

    @Mock
    private ScriptEvaluationService scriptEvaluationService;

    private ScriptTaskExecutor executor;
    private WorkflowTask task;
    private ExecutionContext context;

    @BeforeEach
    void setUp() {
        executor = new ScriptTaskExecutor(scriptEvaluationService);

        ScriptTaskParameters params = new ScriptTaskParameters();
        params.setScript("return 1;");
        params.setLanguage("javascript");

        task = new WorkflowTask();
        task.setTaskId("script_1");
        task.setType(TaskType.SCRIPT_TASK);
        task.setParameters(params);

        context = ExecutionContext.builder().build();
    }

    @Test
    void execute_runsScriptAndReturnsResult() throws Exception {
        when(scriptEvaluationService.executeScript(eq("return 1;"), any()))
                .thenReturn(new ScriptEvaluationService.ScriptResult(42, null));

        TaskExecutionResult result = executor.execute(task, new WorkflowExecution(), context);

        assertEquals(TaskExecutionResult.Status.COMPLETED, result.getStatus());
        assertEquals(42, result.getOutput().get("result"));
    }

    @Test
    void execute_invalidParametersReturnsFailed() {
        task.setParameters(new HttpTaskParameters());

        TaskExecutionResult result = executor.execute(task, new WorkflowExecution(), context);

        assertEquals(TaskExecutionResult.Status.FAILED, result.getStatus());
        assertTrue(result.getErrorMessage().contains("Invalid parameters"));
    }

    @Test
    void execute_scriptErrorReturnsFailed() throws Exception {
        when(scriptEvaluationService.executeScript(any(), any()))
                .thenThrow(new RuntimeException("syntax error"));

        TaskExecutionResult result = executor.execute(task, new WorkflowExecution(), context);

        assertEquals(TaskExecutionResult.Status.FAILED, result.getStatus());
        assertTrue(result.getErrorMessage().contains("syntax error"));
    }
}
