package com.app.common.model.task.parameters;

import java.util.Map;
import lombok.Data;

@Data
public class Neo4jTaskParameters implements TaskParameters {
    private String credentialId;
    private String cypher;
    private Map<String, Object> parameters;
}
