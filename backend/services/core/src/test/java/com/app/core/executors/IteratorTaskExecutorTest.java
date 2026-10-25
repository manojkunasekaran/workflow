package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.IteratorTaskExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.IteratorTaskParameters;
import com.app.common.model.task.parameters.WaitTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.service.TaskExecutor;
import com.app.core.service.VariableResolver;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IteratorTaskExecutorTest {

    @Mock
    private VariableResolver variableResolver;

    @Mock
    private TaskExecutor waitExecutor;

    private IteratorTaskExecutor iteratorTaskExecutor;

    private WorkflowTask iteratorTask;
    private IteratorTaskParameters params;
    private ExecutionContext context;
    private WorkflowExecution execution;

    @BeforeEach
    void setUp() {
        lenient().when(waitExecutor.canExecute(TaskType.WAIT)).thenReturn(true);
        lenient().when(waitExecutor.execute(any(), any(), any())).thenReturn(
                TaskExecutionResult.builder()
                        .status(TaskExecutionResult.Status.COMPLETED)
                        .output(Map.of("ok", true))
                        .build());

        iteratorTaskExecutor = new IteratorTaskExecutor(
                variableResolver, List.of(waitExecutor), new ObjectMapper());

        params = new IteratorTaskParameters();
        params.setLoopOver(List.of("a", "b", "c"));

        WorkflowTask nested = new WorkflowTask();
        nested.setTaskId("loop_step");
        nested.setType(TaskType.WAIT);
        WaitTaskParameters waitParams = new WaitTaskParameters();
        waitParams.setDuration(1000L);
        nested.setParameters(waitParams);
        params.setActions(List.of(nested));

        iteratorTask = new WorkflowTask();
        iteratorTask.setTaskId("loop_task");
        iteratorTask.setType(TaskType.ITERATOR_TASK);
        iteratorTask.setParameters(params);

        context = ExecutionContext.builder().build();
        execution = new WorkflowExecution();
    }

    @Test
    void execute_arrayLoopOver_runsNestedActionPerItem() {
        when(variableResolver.resolveValue(params.getLoopOver(), context)).thenReturn(List.of("a", "b", "c"));

        TaskExecutionResult result = iteratorTaskExecutor.execute(iteratorTask, execution, context);

        assertEquals(TaskExecutionResult.Status.COMPLETED, result.getStatus());
        IteratorTaskExecutionData data = (IteratorTaskExecutionData) result.getExecutionData();
        assertEquals(3, data.getTotalIterations());
        assertEquals(3, data.getSuccessfulIterations());
        assertEquals(0, data.getFailedIterations());
        assertTrue(result.getOutput().containsKey("successfulIterations"));
        assertEquals(3, result.getOutput().get("successfulIterations"));
    }

    @Test
    void execute_numericLoopOver_coercesStringNumber() {
        params.setLoopOver("{{$variables.count}}");
        when(variableResolver.resolveValue("{{$variables.count}}", context)).thenReturn("2");

        TaskExecutionResult result = iteratorTaskExecutor.execute(iteratorTask, execution, context);

        assertEquals(TaskExecutionResult.Status.COMPLETED, result.getStatus());
        IteratorTaskExecutionData data = (IteratorTaskExecutionData) result.getExecutionData();
        assertEquals(2, data.getTotalIterations());
        assertEquals(2, data.getSuccessfulIterations());
    }

    @Test
    void execute_rejectsDisallowedNestedType() {
        WorkflowTask nested = new WorkflowTask();
        nested.setTaskId("bad");
        nested.setType(TaskType.DB_TASK);
        nested.setParameters(new com.app.common.model.task.parameters.DbTaskParameters());
        params.setActions(List.of(nested));

        TaskExecutionResult result = iteratorTaskExecutor.execute(iteratorTask, execution, context);

        assertEquals(TaskExecutionResult.Status.FAILED, result.getStatus());
        assertTrue(result.getErrorMessage() != null && result.getErrorMessage().contains("disallows"));
    }
}
