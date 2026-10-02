package com.app.capability.mcp.auth;

import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

import java.util.Base64;
import java.util.Map;

import io.modelcontextprotocol.client.transport.customizer.McpSyncHttpClientRequestCustomizer;

public final class McpHttpAuthCustomizer {

    private McpHttpAuthCustomizer() {
    }

    public static McpSyncHttpClientRequestCustomizer fromCredentials(@Nullable Map<String, String> credentials) {
        if (credentials == null || credentials.isEmpty()) {
            return noop();
        }

        String token = credentials.get("token");
        if (token != null && !token.isBlank()) {
            return bearer(token.trim());
        }

        String username = credentials.get("username");
        String password = credentials.get("password");
        if (username != null && !username.isBlank() && password != null) {
            return basic(username, password);
        }

        String headerName = credentials.get("headerName");
        String headerValue = credentials.get("headerValue");
        if (headerName != null && !headerName.isBlank() && headerValue != null && !headerValue.isBlank()) {
            return customHeader(headerName.trim(), headerValue);
        }

        return noop();
    }

    private static McpSyncHttpClientRequestCustomizer noop() {
        return (builder, method, endpoint, body, context) -> {
        };
    }

    private static McpSyncHttpClientRequestCustomizer bearer(@NonNull String token) {
        return (builder, method, endpoint, body, context) ->
                builder.header("Authorization", "Bearer " + token);
    }

    private static McpSyncHttpClientRequestCustomizer basic(@NonNull String username, @NonNull String password) {
        String encoded = Base64.getEncoder().encodeToString((username + ":" + password).getBytes());
        return (builder, method, endpoint, body, context) ->
                builder.header("Authorization", "Basic " + encoded);
    }

    private static McpSyncHttpClientRequestCustomizer customHeader(@NonNull String headerName,
                                                                     @NonNull String headerValue) {
        return (builder, method, endpoint, body, context) ->
                builder.header(headerName, headerValue);
    }
}
