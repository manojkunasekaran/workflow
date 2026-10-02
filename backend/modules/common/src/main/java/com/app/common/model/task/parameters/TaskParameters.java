package com.app.common.model.task.parameters;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = HttpTaskParameters.class, name = "HTTP_TASK"),
        @JsonSubTypes.Type(value = ConditionalTaskParameters.class, name = "CONDITIONAL"),
        @JsonSubTypes.Type(value = IteratorTaskParameters.class, name = "ITERATOR_TASK"),
        @JsonSubTypes.Type(value = HumanTaskParameters.class, name = "HUMAN_TASK"),
        @JsonSubTypes.Type(value = BranchTaskParameters.class, name = "BRANCH"),
        @JsonSubTypes.Type(value = WaitTaskParameters.class, name = "WAIT"),
        @JsonSubTypes.Type(value = JoinTaskParameters.class, name = "JOIN"),
        @JsonSubTypes.Type(value = ScriptTaskParameters.class, name = "SCRIPT_TASK"),
        @JsonSubTypes.Type(value = DataTransformTaskParameters.class, name = "DATA_TRANSFORM"),
        @JsonSubTypes.Type(value = SmtpTaskParameters.class, name = "SMTP_TASK"),
        @JsonSubTypes.Type(value = ConnectorTaskParameters.class, name = "CONNECTOR_TASK"),
        @JsonSubTypes.Type(value = AgentsTaskParameters.class, name = "AGENTS_TASK"),
        @JsonSubTypes.Type(value = DbTaskParameters.class, name = "DB_TASK"),
        @JsonSubTypes.Type(value = MongoTaskParameters.class, name = "MONGO_TASK"),
        @JsonSubTypes.Type(value = RedisTaskParameters.class, name = "REDIS_TASK"),
        @JsonSubTypes.Type(value = Neo4jTaskParameters.class, name = "NEO4J_TASK"),
        @JsonSubTypes.Type(value = McpToolTaskParameters.class, name = "MCP_TOOL")
})

public interface TaskParameters {
}
