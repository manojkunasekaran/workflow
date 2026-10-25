package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.DataTransformTaskParameters;
import com.app.common.model.task.parameters.TransformOperation;
import com.app.common.model.task.parameters.HttpTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.service.VariableResolver;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DataTransformTaskExecutorTest {

    @Mock
    private VariableResolver variableResolver;

    private DataTransformTaskExecutor executor;
    private WorkflowTask task;
    private ExecutionContext context;

    @BeforeEach
    void setUp() {
        executor = new DataTransformTaskExecutor(variableResolver, new ObjectMapper());

        DataTransformTaskParameters params = new DataTransformTaskParameters();
        params.setOperation(TransformOperation.JSON_EXTRACT);
        params.setInputData("{{$input.body}}");
        params.setExpression("$.name");

        task = new WorkflowTask();
        task.setTaskId("transform_1");
        task.setType(TaskType.DATA_TRANSFORM);
        task.setParameters(params);

        context = ExecutionContext.builder().build();
    }

    @Test
    void execute_jsonExtractReturnsResult() {
        when(variableResolver.resolveValue(eq("{{$input.body}}"), eq(context)))
                .thenReturn(Map.of("name", "Alice"));

        TaskExecutionResult result = executor.execute(task, new WorkflowExecution(), context);

        assertEquals(TaskExecutionResult.Status.COMPLETED, result.getStatus());
        assertEquals("Alice", result.getOutput().get("result"));
    }

    @Test
    void execute_invalidParametersReturnsFailed() {
        task.setParameters(new HttpTaskParameters());

        TaskExecutionResult result = executor.execute(task, new WorkflowExecution(), context);

        assertEquals(TaskExecutionResult.Status.FAILED, result.getStatus());
        assertTrue(result.getErrorMessage().contains("Invalid parameters"));
    }
}
