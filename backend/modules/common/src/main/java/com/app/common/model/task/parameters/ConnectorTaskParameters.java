package com.app.common.model.task.parameters;

import lombok.Data;
import java.util.Map;

@Data
public class ConnectorTaskParameters implements TaskParameters {
    private String connectorId;
    private String actionId;
    private String credentialId;
    private Map<String, Object> inputs;
    
    // Per-task retry configuration
    private Integer maxRetries;
    private Long retryDelayMs;
}
