package com.app.capability.mcp.transport;

import com.app.capability.mcp.auth.McpHttpAuthCustomizer;
import com.app.common.entity.IntegrationCredential;
import com.app.common.entity.McpTransport;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.List;
import java.util.Map;

import io.modelcontextprotocol.client.transport.HttpClientSseClientTransport;
import io.modelcontextprotocol.client.transport.HttpClientStreamableHttpTransport;
import io.modelcontextprotocol.client.transport.ServerParameters;
import io.modelcontextprotocol.client.transport.StdioClientTransport;
import io.modelcontextprotocol.json.McpJsonDefaults;
import io.modelcontextprotocol.spec.McpClientTransport;

@Component
public class McpTransportResolver {

    public McpClientTransport resolve(@NonNull IntegrationCredential credential,
                                      @NonNull Map<String, String> decryptedCredentials) {
        McpTransport transport = credential.getMcpTransport() != null
                ? credential.getMcpTransport()
                : McpTransport.STREAMABLE_HTTP;

        return switch (transport) {
            case STREAMABLE_HTTP -> {
                String baseUri = resolveBaseUri(credential.getMcpServerUrl());
                String endpointPath = resolveEndpointPath(credential.getMcpEndpointPath());
                var authCustomizer = McpHttpAuthCustomizer.fromCredentials(decryptedCredentials);
                yield HttpClientStreamableHttpTransport.builder(baseUri)
                        .endpoint(endpointPath)
                        .httpRequestCustomizer(authCustomizer)
                        .build();
            }
            case SSE -> {
                String baseUri = resolveBaseUri(credential.getMcpServerUrl());
                String endpointPath = resolveEndpointPath(credential.getMcpEndpointPath());
                var authCustomizer = McpHttpAuthCustomizer.fromCredentials(decryptedCredentials);
                yield HttpClientSseClientTransport.builder(baseUri)
                        .sseEndpoint(endpointPath)
                        .httpRequestCustomizer(authCustomizer)
                        .build();
            }
            case STDIO -> {
                String command = credential.getMcpStdioCommand();
                if (command == null || command.isBlank()) {
                    throw new IllegalArgumentException("MCP stdio command is required");
                }
                ServerParameters.Builder builder = ServerParameters.builder(command.trim());
                List<String> args = credential.getMcpStdioArgs();
                if (args != null && !args.isEmpty()) {
                    builder.args(args.stream()
                            .filter(arg -> arg != null && !arg.isBlank())
                            .toList());
                }
                yield new StdioClientTransport(builder.build(), McpJsonDefaults.getMapper());
            }
        };
    }

    private String resolveBaseUri(String serverUrl) {
        URI uri = URI.create(serverUrl.trim());
        StringBuilder base = new StringBuilder();
        base.append(uri.getScheme()).append("://").append(uri.getHost());
        if (uri.getPort() > 0) {
            base.append(':').append(uri.getPort());
        }
        return base.toString();
    }

    private String resolveEndpointPath(String endpointPath) {
        if (endpointPath == null || endpointPath.isBlank()) {
            return "/mcp";
        }
        return endpointPath.startsWith("/") ? endpointPath : "/" + endpointPath;
    }
}
