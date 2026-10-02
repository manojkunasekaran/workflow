package com.app.api.service.mcp;

import com.app.api.dto.McpToolCallResponse;
import com.app.common.model.mcp.McpToolDescriptor;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.server.McpServer;
import io.modelcontextprotocol.server.McpServerFeatures.SyncToolSpecification;
import io.modelcontextprotocol.server.McpSyncServer;
import io.modelcontextprotocol.server.transport.HttpServletStreamableServerTransportProvider;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.spec.McpSchema.CallToolRequest;
import io.modelcontextprotocol.spec.McpSchema.CallToolResult;
import io.modelcontextprotocol.spec.McpSchema.ServerCapabilities;
import io.modelcontextprotocol.spec.McpSchema.Tool;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Hosts the MCP Streamable HTTP protocol and registers workflow-backed tools on the SDK server.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class McpStreamableServerService {

    private static final String SERVER_NAME = "workflow-platform";
    private static final String SERVER_VERSION = "1.0.0";

    private final HttpServletStreamableServerTransportProvider transportProvider;
    private final McpToolCatalogService toolCatalogService;
    private final McpToolInvocationService toolInvocationService;
    private final McpAuditService mcpAuditService;
    private final McpSettingsService mcpSettingsService;
    private final ObjectMapper objectMapper;

    private final Object serverLock = new Object();
    private volatile McpSyncServer server;

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        refreshTools();
    }

    @PreDestroy
    public void shutdown() {
        closeServer();
    }

    public void refreshTools() {
        synchronized (serverLock) {
            closeServer();
            if (!mcpSettingsService.getEffectiveSettings().isEnabled()) {
                log.debug("MCP Streamable HTTP server not started (MCP server disabled)");
                return;
            }

            server = McpServer.sync(transportProvider)
                    .serverInfo(SERVER_NAME, SERVER_VERSION)
                    .capabilities(ServerCapabilities.builder()
                            .tools(true)
                            .build())
                    .build();

            List<McpToolDescriptor> tools = toolCatalogService.listGlobalTools();
            for (McpToolDescriptor descriptor : tools) {
                server.addTool(buildToolSpecification(descriptor));
            }
            log.info("MCP Streamable HTTP server started with {} tool(s)", tools.size());
        }
    }

    private SyncToolSpecification buildToolSpecification(McpToolDescriptor descriptor) {
        Map<String, Object> schema = descriptor.getInputSchema() != null
                ? descriptor.getInputSchema()
                : defaultInputSchema();

        Tool tool = Tool.builder(descriptor.getName(), schema)
                .description(descriptor.getDescription() != null ? descriptor.getDescription() : "")
                .build();

        return SyncToolSpecification.builder()
                .tool(tool)
                .callHandler((exchange, request) -> invokeTool(descriptor.getName(), request))
                .build();
    }

    private CallToolResult invokeTool(String toolName, CallToolRequest request) {
        long start = System.currentTimeMillis();
        String endpoint = resolveAuditEndpoint();

        try {
            McpToolCatalogService.ResolvedMcpTool resolved = toolCatalogService.resolveGlobalTool(toolName);
            Map<String, Object> arguments = toArgumentMap(request);
            McpToolCallResponse response = toolInvocationService.invoke(resolved, arguments);

            mcpAuditService.logRequest(
                    endpoint,
                    resolved.registration().getId(),
                    resolved.definition().getId(),
                    toolName,
                    true,
                    null,
                    response.getExecutionId(),
                    start);

            return CallToolResult.builder()
                    .content(List.of(new McpSchema.TextContent(formatToolResponse(response))))
                    .build();
        } catch (Exception ex) {
            mcpAuditService.logRequest(endpoint, null, null, toolName, false, ex.getMessage(), null, start);
            return CallToolResult.builder()
                    .isError(true)
                    .content(List.of(new McpSchema.TextContent(ex.getMessage() != null ? ex.getMessage() : "Tool call failed")))
                    .build();
        }
    }

    private Map<String, Object> toArgumentMap(CallToolRequest request) {
        if (request == null || request.arguments() == null) {
            return Map.of();
        }
        Map<String, Object> arguments = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : request.arguments().entrySet()) {
            arguments.put(entry.getKey(), entry.getValue());
        }
        return arguments;
    }

    private String formatToolResponse(McpToolCallResponse response) {
        Map<String, Object> payload = new LinkedHashMap<>();
        if (response.getExecutionId() != null) {
            payload.put("executionId", response.getExecutionId());
        }
        if (response.getResponseMode() != null) {
            payload.put("responseMode", response.getResponseMode());
        }
        if (response.getResult() != null) {
            payload.put("result", response.getResult());
        }
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            return payload.toString();
        }
    }

    private String resolveAuditEndpoint() {
        String path = mcpSettingsService.getEffectiveSettings().getGlobalEndpointPath();
        if (path == null || path.isBlank()) {
            return "/mcp";
        }
        return path.startsWith("/") ? path : "/" + path;
    }

    private Map<String, Object> defaultInputSchema() {
        return Map.of("type", "object", "properties", Map.of());
    }

    private void closeServer() {
        if (server != null) {
            try {
                server.close();
            } catch (Exception ex) {
                log.warn("Failed to close MCP Streamable HTTP server cleanly", ex);
            } finally {
                server = null;
            }
        }
    }
}
