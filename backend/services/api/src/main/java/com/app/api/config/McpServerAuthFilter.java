package com.app.api.config;

import com.app.api.exception.McpInboundException;
import com.app.api.service.mcp.McpAuditService;
import com.app.api.service.mcp.McpSettingsService;
import com.app.common.model.settings.McpSettings;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@RequiredArgsConstructor
public class McpServerAuthFilter extends OncePerRequestFilter {

    private final McpSettingsService mcpSettingsService;
    private final McpAuditService mcpAuditService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String servletPath = request.getServletPath();
        return servletPath == null || !servletPath.startsWith("/mcp");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        long start = System.currentTimeMillis();
        String endpoint = request.getServletPath();

        try {
            McpSettings settings = mcpSettingsService.getEffectiveSettings();
            if (!settings.isEnabled()) {
                throw new McpInboundException(HttpStatus.FORBIDDEN, "MCP server is disabled");
            }
            if (!mcpSettingsService.hasConfiguredToken()) {
                throw new McpInboundException(HttpStatus.FORBIDDEN, "MCP server auth token is not configured");
            }

            String bearer = extractBearerToken(request.getHeader(HttpHeaders.AUTHORIZATION));
            if (bearer == null) {
                throw new McpInboundException(HttpStatus.UNAUTHORIZED, "Missing Authorization bearer token");
            }
            if (!mcpSettingsService.validateBearerToken(bearer)) {
                throw new McpInboundException(HttpStatus.UNAUTHORIZED, "Invalid MCP bearer token");
            }

            filterChain.doFilter(request, response);
        } catch (McpInboundException ex) {
            mcpAuditService.logAuthFailure(endpoint, ex.getMessage(), start);
            response.setStatus(ex.getStatus().value());
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"" + escapeJson(ex.getMessage()) + "\"}");
        }
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            return null;
        }
        if (!authorizationHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return null;
        }
        String token = authorizationHeader.substring(7).trim();
        return token.isEmpty() ? null : token;
    }

    private String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
