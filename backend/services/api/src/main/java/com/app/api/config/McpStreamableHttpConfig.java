package com.app.api.config;

import com.app.api.service.mcp.McpSettingsService;
import io.modelcontextprotocol.json.McpJsonDefaults;
import io.modelcontextprotocol.server.transport.HttpServletStreamableServerTransportProvider;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class McpStreamableHttpConfig {

    @Bean
    public HttpServletStreamableServerTransportProvider mcpStreamableTransportProvider(
            McpSettingsService mcpSettingsService) {
        String endpoint = resolveEndpointPath(mcpSettingsService);
        return HttpServletStreamableServerTransportProvider.builder()
                .jsonMapper(McpJsonDefaults.getMapper())
                .mcpEndpoint(endpoint)
                .build();
    }

    @Bean
    public ServletRegistrationBean<HttpServletStreamableServerTransportProvider> mcpStreamableServlet(
            HttpServletStreamableServerTransportProvider transportProvider,
            McpSettingsService mcpSettingsService) {
        ServletRegistrationBean<HttpServletStreamableServerTransportProvider> registration =
                new ServletRegistrationBean<>(transportProvider);
        registration.setName("mcpStreamableServlet");
        registration.setLoadOnStartup(1);
        registration.addUrlMappings(resolveEndpointPath(mcpSettingsService) + "/*");
        return registration;
    }

    private String resolveEndpointPath(McpSettingsService mcpSettingsService) {
        String path = mcpSettingsService.getEffectiveSettings().getGlobalEndpointPath();
        if (path == null || path.isBlank()) {
            return "/mcp";
        }
        return path.startsWith("/") ? path : "/" + path;
    }
}
