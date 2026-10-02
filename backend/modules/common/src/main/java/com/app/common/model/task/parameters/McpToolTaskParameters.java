package com.app.common.model.task.parameters;

import lombok.Data;

import java.util.Map;

@Data
public class McpToolTaskParameters implements TaskParameters {

    private String credentialId;
    private String remoteToolName;
    private Object arguments;
    private Integer timeoutSeconds;

    public int timeoutSecondsOrDefault() {
        return timeoutSeconds != null && timeoutSeconds > 0 ? timeoutSeconds : 30;
    }
}
