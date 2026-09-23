package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.RedisTaskExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.RedisTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.service.CredentialProvider;
import com.app.core.service.TaskExecutor;
import com.app.core.service.VariableResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import redis.clients.jedis.Jedis;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class RedisTaskExecutor implements TaskExecutor {

    private final VariableResolver variableResolver;
    private final CredentialProvider credentialProvider;

    @Override
    public boolean canExecute(TaskType taskType) {
        return TaskType.REDIS_TASK == taskType;
    }

    @Override
    public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
        log.info("Starting execution of REDIS Task: {}", task.getTaskId());

        try {
            if (!(task.getParameters() instanceof RedisTaskParameters params)) {
                return failResult("Invalid parameters for Redis task");
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
            String host = creds.get("host");
            String portStr = creds.get("port");
            int port = (portStr != null && !portStr.isBlank()) ? Integer.parseInt(portStr) : 6379;
            String password = creds.get("password");
            String dbStr = creds.get("database");
            int database = (dbStr != null && !dbStr.isBlank()) ? Integer.parseInt(dbStr) : 0;

            try (Jedis jedis = new Jedis(host, port)) {
                if (password != null && !password.isBlank()) {
                    jedis.auth(password);
                }
                jedis.select(database);

                String command = params.getCommand();
                String key = variableResolver.resolveString(params.getKey(), context);
                Object result = null;

                if ("GET".equalsIgnoreCase(command)) {
                    result = jedis.get(key);
                } else if ("SET".equalsIgnoreCase(command)) {
                    String value = variableResolver.resolveString(params.getValue(), context);
                    if (params.getTtl() != null && params.getTtl() > 0) {
                        result = jedis.setex(key, params.getTtl(), value);
                    } else {
                        result = jedis.set(key, value);
                    }
                } else if ("DEL".equalsIgnoreCase(command)) {
                    result = jedis.del(key);
                } else {
                    return failResult("Unsupported command: " + command);
                }

                RedisTaskExecutionData data = new RedisTaskExecutionData();
                data.setResult(result);
                return TaskExecutionResult.builder()
                        .status(TaskExecutionResult.Status.COMPLETED)
                        .executionData(data)
                        .output(data.toOutputMap())
                        .build();
            }
        } catch (Exception e) {
            log.error("Redis Task [{}] — Exception: {}", task.getTaskId(), e.getMessage(), e);
            return failResult("Error: " + e.getMessage());
        }
    }

    private TaskExecutionResult failResult(String errorMessage) {
        RedisTaskExecutionData data = new RedisTaskExecutionData();
        return TaskExecutionResult.builder()
                .status(TaskExecutionResult.Status.FAILED)
                .errorMessage(errorMessage)
                .executionData(data)
                .output(data.toOutputMap())
                .build();
    }
}
