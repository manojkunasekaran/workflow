package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.DbTaskParameters;
import com.app.common.model.task.parameters.HttpTaskParameters;
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

@ExtendWith(MockitoExtension.class)
class DbTaskExecutorTest {

    @Mock
    private VariableResolver variableResolver;
    @Mock
    private CredentialProvider credentialProvider;

    private DbTaskExecutor executor;
    private WorkflowTask task;
    private ExecutionContext context;

    @BeforeEach
    void setUp() {
        executor = new DbTaskExecutor(variableResolver, credentialProvider);

        DbTaskParameters params = new DbTaskParameters();
        params.setOperation("SELECT");
        params.setCredentialId("db-cred");
        params.setTable("users");

        task = new WorkflowTask();
        task.setTaskId("db_1");
        task.setType(TaskType.DB_TASK);
        task.setParameters(params);

        context = ExecutionContext.builder().build();
    }

    @Test
    void execute_invalidParametersReturnsFailed() {
        task.setParameters(new HttpTaskParameters());

        TaskExecutionResult result = executor.execute(task, new WorkflowExecution(), context);

        assertEquals(TaskExecutionResult.Status.FAILED, result.getStatus());
        assertTrue(result.getErrorMessage().contains("Invalid parameters"));
    }
}
