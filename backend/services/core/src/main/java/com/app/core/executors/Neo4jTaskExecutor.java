package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.Neo4jTaskExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.Neo4jTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.service.CredentialProvider;
import com.app.core.service.TaskExecutor;
import com.app.core.service.VariableResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.neo4j.driver.AuthTokens;
import org.neo4j.driver.Driver;
import org.neo4j.driver.GraphDatabase;
import org.neo4j.driver.Session;
import org.neo4j.driver.SessionConfig;
import org.neo4j.driver.Result;
import org.springframework.stereotype.Component;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class Neo4jTaskExecutor implements TaskExecutor {

    private final VariableResolver variableResolver;
    private final CredentialProvider credentialProvider;

    @Override
    public boolean canExecute(TaskType taskType) {
        return TaskType.NEO4J_TASK == taskType;
    }

    @Override
    public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
        log.info("Starting execution of NEO4J Task: {}", task.getTaskId());

        try {
            if (!(task.getParameters() instanceof Neo4jTaskParameters params)) {
                return failResult("Invalid parameters for Neo4j task");
            }

            String credentialId = variableResolver.resolveString(params.getCredentialId(), context);
            if (credentialId == null || credentialId.isBlank()) {
                return failResult("Connection credential is required");
            }

            com.app.common.entity.IntegrationCredential credential = credentialProvider
                    .resolveCredential(credentialId, null, context)
                    .orElse(null);
            
            if (credential == null) {
                return failResult("Credential not found or access denied: " + credentialId);
            }

            Map<String, String> creds = credential.getCredentials();
            String host = creds.get("host"); // Expected format like bolt://localhost:7687 or neo4j://...
            String username = creds.get("username");
            String password = creds.get("password");
            String dbStr = creds.get("database");
            String database = (dbStr != null && !dbStr.isBlank()) ? dbStr : "neo4j";

            try (Driver driver = GraphDatabase.driver(host, AuthTokens.basic(username, password))) {
                try (Session session = driver.session(SessionConfig.builder().withDatabase(database).build())) {
                    String cypher = variableResolver.resolveString(params.getCypher(), context);
                    
                    Map<String, Object> resolvedParams = new HashMap<>();
                    if (params.getParameters() != null) {
                        params.getParameters().forEach((k, v) -> {
                            resolvedParams.put(k, variableResolver.resolveValue(v, context));
                        });
                    }

                    Result result = session.run(cypher, resolvedParams);
                    List<Map<String, Object>> records = result.list().stream()
                            .map(record -> record.asMap())
                            .collect(Collectors.toList());

                    Neo4jTaskExecutionData data = new Neo4jTaskExecutionData();
                    data.setResult(records);
                    return TaskExecutionResult.builder()
                            .status(TaskExecutionResult.Status.COMPLETED)
                            .executionData(data)
                            .output(data.toOutputMap())
                            .build();
                }
            }
        } catch (Exception e) {
            log.error("Neo4j Task [{}] — Exception: {}", task.getTaskId(), e.getMessage(), e);
            return failResult("Error: " + e.getMessage());
        }
    }

    private TaskExecutionResult failResult(String errorMessage) {
        Neo4jTaskExecutionData data = new Neo4jTaskExecutionData();
        return TaskExecutionResult.builder()
                .status(TaskExecutionResult.Status.FAILED)
                .errorMessage(errorMessage)
                .executionData(data)
                .output(data.toOutputMap())
                .build();
    }
}
