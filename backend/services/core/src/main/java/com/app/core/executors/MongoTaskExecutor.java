package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.MongoTaskExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.MongoTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.service.CredentialProvider;
import com.app.core.service.TaskExecutor;
import com.app.core.service.VariableResolver;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.stereotype.Component;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class MongoTaskExecutor implements TaskExecutor {

    private final VariableResolver variableResolver;
    private final CredentialProvider credentialProvider;

    @Override
    public boolean canExecute(TaskType taskType) {
        return TaskType.MONGO_TASK == taskType;
    }

    @Override
    public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
        log.info("Starting execution of MONGO Task: {}", task.getTaskId());

        try {
            if (!(task.getParameters() instanceof MongoTaskParameters params)) {
                return failResult("Invalid parameters for Mongo task");
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
            String port = creds.get("port");
            String database = creds.get("database");
            String username = creds.get("username");
            String password = creds.get("password");

            String p = (port != null && !port.isBlank()) ? port : "27017";
            String uri;
            if (username != null && !username.isBlank()) {
                uri = String.format("mongodb://%s:%s@%s:%s/%s", username, password, host, p, database);
            } else {
                uri = String.format("mongodb://%s:%s/%s", host, p, database);
            }

            try (MongoClient mongoClient = MongoClients.create(uri)) {
                MongoDatabase db = mongoClient.getDatabase(database);
                String collectionName = variableResolver.resolveString(params.getCollection(), context);
                MongoCollection<Document> collection = db.getCollection(collectionName);
                
                String operation = params.getOperation();
                Object result = null;

                if ("FIND".equalsIgnoreCase(operation)) {
                    String filterStr = variableResolver.resolveString(params.getFilter(), context);
                    Document filter = filterStr != null && !filterStr.isBlank() ? Document.parse(filterStr) : new Document();
                    List<Document> docs = new ArrayList<>();
                    collection.find(filter).into(docs);
                    result = docs;
                } else if ("INSERT".equalsIgnoreCase(operation)) {
                    String docStr = variableResolver.resolveString(params.getDocument(), context);
                    Document doc = Document.parse(docStr);
                    collection.insertOne(doc);
                    result = "Inserted";
                } else if ("UPDATE".equalsIgnoreCase(operation)) {
                    String filterStr = variableResolver.resolveString(params.getFilter(), context);
                    Document filter = Document.parse(filterStr);
                    String docStr = variableResolver.resolveString(params.getDocument(), context);
                    Document doc = Document.parse(docStr);
                    result = collection.updateMany(filter, new Document("$set", doc)).getModifiedCount();
                } else if ("DELETE".equalsIgnoreCase(operation)) {
                    String filterStr = variableResolver.resolveString(params.getFilter(), context);
                    Document filter = Document.parse(filterStr);
                    result = collection.deleteMany(filter).getDeletedCount();
                } else {
                    return failResult("Unsupported operation: " + operation);
                }

                MongoTaskExecutionData data = new MongoTaskExecutionData();
                data.setResult(result);
                return TaskExecutionResult.builder()
                        .status(TaskExecutionResult.Status.COMPLETED)
                        .executionData(data)
                        .output(data.toOutputMap())
                        .build();
            }
        } catch (Exception e) {
            log.error("Mongo Task [{}] — Exception: {}", task.getTaskId(), e.getMessage(), e);
            return failResult("Error: " + e.getMessage());
        }
    }

    private TaskExecutionResult failResult(String errorMessage) {
        MongoTaskExecutionData data = new MongoTaskExecutionData();
        return TaskExecutionResult.builder()
                .status(TaskExecutionResult.Status.FAILED)
                .errorMessage(errorMessage)
                .executionData(data)
                .output(data.toOutputMap())
                .build();
    }
}
