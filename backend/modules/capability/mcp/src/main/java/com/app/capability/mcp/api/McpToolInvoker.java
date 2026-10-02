package com.app.capability.mcp.api;

import com.app.common.entity.IntegrationCredential;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;

import io.modelcontextprotocol.client.McpSyncClient;
import io.modelcontextprotocol.spec.McpSchema.CallToolRequest;
import io.modelcontextprotocol.spec.McpSchema.CallToolResult;

@Component
@RequiredArgsConstructor
public class McpToolInvoker {

    private final McpClientFactory clientFactory;

    public CallToolResult callTool(IntegrationCredential credential,
                                   Map<String, String> decryptedCredentials,
                                   String toolName,
                                   Map<String, Object> arguments,
                                   int timeoutSeconds) {
        if (timeoutSeconds <= 0) {
            throw new IllegalArgumentException("timeoutSeconds must be positive");
        }
        McpSyncClient client = clientFactory.createClient(
                credential, decryptedCredentials, Duration.ofSeconds(timeoutSeconds));
        try {
            return client.callTool(new CallToolRequest(toolName, arguments, null));
        } finally {
            client.close();
        }
    }
}
