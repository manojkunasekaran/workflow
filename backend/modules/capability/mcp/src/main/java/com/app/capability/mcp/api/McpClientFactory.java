package com.app.capability.mcp.api;

import com.app.capability.mcp.transport.McpTransportResolver;
import com.app.common.entity.IntegrationCredential;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;

import io.modelcontextprotocol.client.McpClient;
import io.modelcontextprotocol.client.McpSyncClient;

@Component
@RequiredArgsConstructor
public class McpClientFactory {

    private static final Duration DEFAULT_REQUEST_TIMEOUT = Duration.ofSeconds(30);

    private final McpTransportResolver transportResolver;

    public McpSyncClient createClient(@NonNull IntegrationCredential credential,
                                      @NonNull Map<String, String> decryptedCredentials) {
        return createClient(credential, decryptedCredentials, DEFAULT_REQUEST_TIMEOUT);
    }

    public McpSyncClient createClient(@NonNull IntegrationCredential credential,
                                      @NonNull Map<String, String> decryptedCredentials,
                                      @NonNull Duration requestTimeout) {
        var transport = transportResolver.resolve(credential, decryptedCredentials);
        McpSyncClient client = McpClient.sync(transport)
                .requestTimeout(requestTimeout)
                .build();
        client.initialize();
        return client;
    }
}
