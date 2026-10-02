package com.app.common.entity;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.mongodb.core.mapping.Document;

import com.app.common.constant.CollectionNames;
import com.app.common.model.base.BaseModel;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data
@EqualsAndHashCode(callSuper = true)
@Document(collection = CollectionNames.INTEGRATION_CREDENTIALS)
public class IntegrationCredential extends BaseModel {
    private String organizationId;
    private String connectorId; // Optional: Link to a specific connector
    private String name;
    private String type;
    private Map<String, String> credentials;

    /**
     * For OAuth2 credentials — the instant the access_token expires.
     * Null for non-expiring credential types (API keys, Bearer tokens, etc.).
     * Used by {@code OAuthTokenRefreshJob} to proactively refresh tokens.
     */
    private Instant tokenExpiresAt;

    /**
     * Discriminator used by the token refresh scheduler.
     * Set to {@code "oauth2"} for credentials created through the OAuth2 flow.
     * Null for all other credential types.
     */
    private String tokenType;

    /**
     * Connection health state — updated by the refresh job and verify endpoint.
     */
    private ConnectionStatus connectionStatus = ConnectionStatus.UNKNOWN;

    /**
     * Human-readable identity — e.g. "john@gmail.com", "My Workspace", "sk-...3f9a".
     * Populated after successful OAuth or after user saves.
     */
    private String connectedAs;

    /**
     * User ID for PERSONAL scope credentials.
     */
    private String userId;

    /**
     * When was this connection last successfully used by a workflow execution?
     */
    private Instant lastUsedAt;
    
    /**
     * The scope of this credential: PERSONAL, ORG_SHARED, or PLATFORM.
     */
    private CredentialScope credentialScope = CredentialScope.PERSONAL;

    /**
     * MCP server base URL — only when {@code type = MCP_SERVER}.
     * Example: {@code https://mcp.example.com}
     */
    private String mcpServerUrl;

    /**
     * MCP HTTP endpoint path — only when {@code type = MCP_SERVER}.
     * Defaults to {@code /mcp} for Streamable HTTP.
     */
    private String mcpEndpointPath = "/mcp";

    /**
     * MCP HTTP transport — only when {@code type = MCP_SERVER}.
     */
    private McpTransport mcpTransport = McpTransport.STREAMABLE_HTTP;

    /**
     * MCP stdio command — only when {@code type = MCP_SERVER} and transport is STDIO.
     */
    private String mcpStdioCommand;

    /**
     * MCP stdio command arguments — only when transport is STDIO.
     */
    private List<String> mcpStdioArgs;
}