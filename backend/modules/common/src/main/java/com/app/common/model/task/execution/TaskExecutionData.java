package com.app.common.model.task.execution;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

/**
 * Base interface for task-specific execution data.
 * Each task type (HTTP, Script, Conditional, etc.) will have its own
 * implementation.
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "taskType")
@JsonSubTypes({
        @JsonSubTypes.Type(value = BranchTaskExecutionData.class, name = "BRANCH"),
        @JsonSubTypes.Type(value = ConnectorTaskExecutionData.class, name = "CONNECTOR_TASK"),
        @JsonSubTypes.Type(value = ConditionalTaskExecutionData.class, name = "CONDITIONAL"),
        @JsonSubTypes.Type(value = DataTransformExecutionData.class, name = "DATA_TRANSFORM"),
        @JsonSubTypes.Type(value = HttpTaskExecutionData.class, name = "HTTP_TASK"),
        @JsonSubTypes.Type(value = HumanTaskExecutionData.class, name = "HUMAN_TASK"),
        @JsonSubTypes.Type(value = IteratorTaskExecutionData.class, name = "ITERATOR"),
        @JsonSubTypes.Type(value = JoinTaskExecutionData.class, name = "JOIN"),
        @JsonSubTypes.Type(value = ScriptTaskExecutionData.class, name = "SCRIPT_TASK"),
        @JsonSubTypes.Type(value = SmtpTaskExecutionData.class, name = "SMTP_TASK"),
        @JsonSubTypes.Type(value = WaitTaskExecutionData.class, name = "WAIT"),
        @JsonSubTypes.Type(value = AgentsTaskExecutionData.class, name = "AGENTS_TASK"),
        @JsonSubTypes.Type(value = DbTaskExecutionData.class, name = "DB_TASK"),
        @JsonSubTypes.Type(value = MongoTaskExecutionData.class, name = "MONGO_TASK"),
        @JsonSubTypes.Type(value = RedisTaskExecutionData.class, name = "REDIS_TASK"),
        @JsonSubTypes.Type(value = Neo4jTaskExecutionData.class, name = "NEO4J_TASK"),
        @JsonSubTypes.Type(value = McpToolTaskExecutionData.class, name = "MCP_TOOL")
})
public interface TaskExecutionData {

    /**
     * Returns the task type identifier (e.g., "HTTP_TASK", "SCRIPT_TASK").
     */
    String getTaskType();

    /**
     * Converts execution data into an output map for downstream variable
     * resolution.
     * This map is stored in the execution context under the task's ID,
     * allowing downstream tasks to reference values via {{$tasks.taskId.field}}.
     *
     * @return Map of output key-value pairs
     */
    Map<String, Object> toOutputMap();
}
