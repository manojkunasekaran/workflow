package com.app.common.model.settings;

import com.app.common.model.trigger.McpExposureMode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Organization-level MCP server settings stored in {@code Organization.settings.mcp}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class McpSettings {

    @Builder.Default
    private boolean enabled = false;

    @Builder.Default
    private McpExposureMode exposureMode = McpExposureMode.BOTH;

    @Builder.Default
    private String globalEndpointPath = "/mcp";

    /**
     * AES-GCM encrypted inbound MCP server bearer token.
     */
    private String authTokenEncrypted;

    /**
     * When true, org admins may create STDIO transport MCP credentials (self-hosted only).
     */
    @Builder.Default
    private boolean allowStdioTransport = false;
}
