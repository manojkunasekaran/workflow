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
    private Integer mcpToolCallTimeoutSeconds;
    private Integer maxMcpToolCallsPerRun;

    public enum AgentToolSource {
        TASK, MCP
    }

    @lombok.Data
    public static class AgentTool {
        private String name;
        private String description;
        private String targetTaskId;
        private java.util.Map<String, Object> inputSchema;
        private AgentToolSource sourceType;
        private String credentialId;
        private String remoteToolName;
    }

    public static boolean isMcpTool(AgentTool tool) {
        if (tool == null) {
            return false;
        }
        return tool.getSourceType() == AgentToolSource.MCP
                || (tool.getCredentialId() != null && !tool.getCredentialId().isBlank());
    }

    public static String credentialNameSlug(String credentialName) {
        if (credentialName == null || credentialName.isBlank()) {
            return "mcp";
        }
        String slug = credentialName.toLowerCase().replace(' ', '_');
        return slug.length() > 32 ? slug.substring(0, 32) : slug;
    }

    public static String resolveLlmToolName(AgentTool tool, String credentialName) {
        if (isMcpTool(tool)) {
            return credentialNameSlug(credentialName) + "__" + tool.getRemoteToolName();
        }
        return tool.getName();
    }

    public int mcpToolCallTimeoutSecondsOrDefault() {
        return mcpToolCallTimeoutSeconds != null ? mcpToolCallTimeoutSeconds : 30;
    }

    public int maxMcpToolCallsPerRunOrDefault() {
        return maxMcpToolCallsPerRun != null ? maxMcpToolCallsPerRun : 20;
    }
}
