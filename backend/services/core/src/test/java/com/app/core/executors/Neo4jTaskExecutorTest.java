package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.HttpTaskParameters;
import com.app.common.model.task.parameters.Neo4jTaskParameters;
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
class Neo4jTaskExecutorTest {

    @Mock
    private VariableResolver variableResolver;
    @Mock
    private CredentialProvider credentialProvider;

    private Neo4jTaskExecutor executor;
    private WorkflowTask task;
    private ExecutionContext context;

    @BeforeEach
    void setUp() {
        executor = new Neo4jTaskExecutor(variableResolver, credentialProvider);

        Neo4jTaskParameters params = new Neo4jTaskParameters();
        params.setCredentialId("neo4j-cred");
        params.setCypher("RETURN 1");

        task = new WorkflowTask();
        task.setTaskId("neo4j_1");
        task.setType(TaskType.NEO4J_TASK);
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
