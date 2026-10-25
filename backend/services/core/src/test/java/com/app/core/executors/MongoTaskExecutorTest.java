package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.HttpTaskParameters;
import com.app.common.model.task.parameters.MongoTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.service.CredentialProvider;
import com.app.core.service.VariableResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MongoTaskExecutorTest {

    @Mock
    private VariableResolver variableResolver;
    @Mock
    private CredentialProvider credentialProvider;

    private MongoTaskExecutor executor;
    private WorkflowTask task;
    private ExecutionContext context;

    @BeforeEach
    void setUp() {
        executor = new MongoTaskExecutor(variableResolver, credentialProvider);

        MongoTaskParameters params = new MongoTaskParameters();
        params.setCredentialId("mongo-cred");
        params.setOperation("FIND");
        params.setCollection("items");

        task = new WorkflowTask();
        task.setTaskId("mongo_1");
        task.setType(TaskType.MONGO_TASK);
        task.setParameters(params);

        context = ExecutionContext.builder().build();
    }

    @Test
    void execute_missingCredentialIdReturnsFailed() {
        MongoTaskParameters params = (MongoTaskParameters) task.getParameters();
        params.setCredentialId("");
        when(variableResolver.resolveString(eq(""), eq(context))).thenReturn("");

        TaskExecutionResult result = executor.execute(task, new WorkflowExecution(), context);

        assertEquals(TaskExecutionResult.Status.FAILED, result.getStatus());
        assertTrue(result.getErrorMessage().contains("credential"));
    }

    @Test
    void execute_invalidParametersReturnsFailed() {
        task.setParameters(new HttpTaskParameters());

        TaskExecutionResult result = executor.execute(task, new WorkflowExecution(), context);

        assertEquals(TaskExecutionResult.Status.FAILED, result.getStatus());
        assertTrue(result.getErrorMessage().contains("Invalid parameters"));
    }
}
