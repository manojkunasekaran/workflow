package com.app.capability.mcp.spring;

import com.app.capability.mcp.api.McpClientFactory;
import com.app.capability.mcp.api.McpToolDiscoveryService;
import com.app.capability.mcp.api.McpToolInvoker;
import com.app.capability.mcp.transport.McpTransportResolver;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.context.annotation.Import;

@AutoConfiguration
@Import({
        McpTransportResolver.class,
        McpClientFactory.class,
        McpToolDiscoveryService.class,
        McpToolInvoker.class
})
public class McpClientAutoConfiguration {
}
