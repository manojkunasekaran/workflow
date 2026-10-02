package com.app.api.config;

import com.app.api.service.mcp.McpAuditService;
import com.app.api.service.mcp.McpSettingsService;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

@Configuration
public class McpServerAuthConfig {

    @Bean
    public FilterRegistrationBean<McpServerAuthFilter> mcpServerAuthFilter(
            McpSettingsService mcpSettingsService,
            McpAuditService mcpAuditService) {
        FilterRegistrationBean<McpServerAuthFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new McpServerAuthFilter(mcpSettingsService, mcpAuditService));
        registration.addUrlPatterns("/mcp", "/mcp/*");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 10);
        return registration;
    }
}
