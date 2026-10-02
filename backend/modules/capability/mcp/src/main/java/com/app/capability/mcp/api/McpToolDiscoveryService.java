package com.app.capability.mcp.api;

import com.app.common.entity.IntegrationCredential;
import com.app.common.model.mcp.McpToolDescriptor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import io.modelcontextprotocol.client.McpSyncClient;
import io.modelcontextprotocol.spec.McpSchema.ListToolsResult;
import io.modelcontextprotocol.spec.McpSchema.Tool;

@Component
@RequiredArgsConstructor
public class McpToolDiscoveryService {

    private final McpClientFactory clientFactory;

    public List<McpToolDescriptor> listTools(IntegrationCredential credential,
                                             Map<String, String> decryptedCredentials) {
        McpSyncClient client = clientFactory.createClient(credential, decryptedCredentials);
        try {
            List<McpToolDescriptor> tools = new ArrayList<>();
            String cursor = null;
            do {
                ListToolsResult result = cursor == null ? client.listTools() : client.listTools(cursor);
                if (result.tools() != null) {
                    result.tools().forEach(tool -> tools.add(toDescriptor(tool)));
                }
                cursor = result.nextCursor();
            } while (cursor != null && !cursor.isBlank());
            return tools;
        } finally {
            client.close();
        }
    }

    private McpToolDescriptor toDescriptor(Tool tool) {
        return new McpToolDescriptor(tool.name(), tool.description(), tool.inputSchema());
    }
}
