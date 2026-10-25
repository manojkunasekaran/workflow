package com.app.core.executors;

import com.app.common.entity.WorkflowDefinition;
import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.execution.WaitTaskExecutionData;
import com.app.common.model.task.parameters.HttpTaskParameters;
import com.app.common.model.task.parameters.WaitTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.service.VariableResolver;
import com.app.messaging.dispatch.DelayedExecutionMessageDispatcher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WaitTaskExecutorTest {

    @Mock
    private VariableResolver variableResolver;
    @Mock
    private DelayedExecutionMessageDispatcher delayedExecutionMessageDispatcher;

    private WaitTaskExecutor executor;
    private WorkflowTask task;
    private ExecutionContext context;
    private WorkflowExecution execution;

    @BeforeEach
    void setUp() {
        executor = new WaitTaskExecutor(variableResolver, delayedExecutionMessageDispatcher);

        WaitTaskParameters params = new WaitTaskParameters();
        params.setDuration(500L);

        task = new WorkflowTask();
        task.setTaskId("wait_1");
        task.setType(TaskType.WAIT);
        task.setParameters(params);

        WorkflowDefinition definition = new WorkflowDefinition();
        definition.setTasks(List.of(task));
        context = ExecutionContext.builder().workflowDefinition(definition).build();
        execution = new WorkflowExecution();
        execution.setId("exec-1");
    }

    @Test
    void execute_schedulesPauseWithDuration() {
        when(variableResolver.resolveValue("500", context)).thenReturn(500L);

        TaskExecutionResult result = executor.execute(task, execution, context);

        assertEquals(TaskExecutionResult.Status.PAUSED, result.getStatus());
        WaitTaskExecutionData data = (WaitTaskExecutionData) result.getExecutionData();
        assertEquals(500L, data.getDuration());
        verify(delayedExecutionMessageDispatcher).dispatch(eq("exec-1"), eq(500L));
    }

    @Test
    void execute_invalidDurationReturnsFailed() {
        WaitTaskParameters params = (WaitTaskParameters) task.getParameters();
        params.setDuration(-1L);
        when(variableResolver.resolveValue("-1", context)).thenReturn(-1L);

        TaskExecutionResult result = executor.execute(task, execution, context);

        assertEquals(TaskExecutionResult.Status.FAILED, result.getStatus());
    }

    @Test
    void execute_invalidParametersThrows() {
        task.setParameters(new HttpTaskParameters());

        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                () -> executor.execute(task, execution, context));
    }
}
