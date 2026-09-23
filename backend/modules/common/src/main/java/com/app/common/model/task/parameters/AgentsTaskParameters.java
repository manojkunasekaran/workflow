package com.app.common.model.task.parameters;

import lombok.Data;

@Data
public class AgentsTaskParameters implements TaskParameters {
    private String providerUrl; // e.g. https://api.openai.com
    private String model;
    private String systemPrompt;
    private String userPrompt;
    private String credentialId;
    private Double temperature;
    private Integer maxTokens;
    private Boolean stream;
    private String agentMode; // 'REACT' or 'SINGLE_CALL'
    private Integer maxLoops;
    private java.util.List<AgentTool> tools;

    @lombok.Data
    public static class AgentTool {
        private String name;
        private String description;
        private String targetTaskId;
        private java.util.Map<String, Object> inputSchema;
    }
}
