package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.HttpTaskParameters;
import com.app.common.model.task.parameters.RedisTaskParameters;
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
class RedisTaskExecutorTest {

    @Mock
    private VariableResolver variableResolver;
    @Mock
    private CredentialProvider credentialProvider;

    private RedisTaskExecutor executor;
    private WorkflowTask task;
    private ExecutionContext context;

    @BeforeEach
    void setUp() {
        executor = new RedisTaskExecutor(variableResolver, credentialProvider);

        RedisTaskParameters params = new RedisTaskParameters();
        params.setCredentialId("redis-cred");
        params.setCommand("GET");
        params.setKey("mykey");

        task = new WorkflowTask();
        task.setTaskId("redis_1");
        task.setType(TaskType.REDIS_TASK);
        task.setParameters(params);

        context = ExecutionContext.builder().build();
    }

    @Test
    void execute_missingCredentialReturnsFailed() {
        when(variableResolver.resolveString(eq("redis-cred"), eq(context))).thenReturn("redis-cred");
        when(credentialProvider.resolveCredential(eq("redis-cred"), eq(null), eq(context)))
                .thenReturn(java.util.Optional.empty());

        TaskExecutionResult result = executor.execute(task, new WorkflowExecution(), context);

        assertEquals(TaskExecutionResult.Status.FAILED, result.getStatus());
        assertTrue(result.getErrorMessage().contains("Credential not found"));
    }

    @Test
    void execute_invalidParametersReturnsFailed() {
        task.setParameters(new HttpTaskParameters());

        TaskExecutionResult result = executor.execute(task, new WorkflowExecution(), context);

        assertEquals(TaskExecutionResult.Status.FAILED, result.getStatus());
        assertTrue(result.getErrorMessage().contains("Invalid parameters"));
    }
}
