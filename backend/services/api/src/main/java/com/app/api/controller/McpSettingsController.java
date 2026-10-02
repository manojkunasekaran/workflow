package com.app.api.controller;

import com.app.api.dto.McpRegenerateTokenResponse;
import com.app.api.dto.McpSettingsResponse;
import com.app.api.dto.McpSettingsUpdateRequest;
import com.app.api.service.mcp.McpAuditService;
import com.app.api.service.mcp.McpSettingsService;
import com.app.api.service.mcp.McpStreamableServerService;
import com.app.common.entity.TriggerMcpLog;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/settings/mcp")
@RequiredArgsConstructor
public class McpSettingsController {

    private final McpSettingsService mcpSettingsService;
    private final McpAuditService mcpAuditService;
    private final McpStreamableServerService mcpStreamableServerService;

    @GetMapping
    public McpSettingsResponse getSettings() {
        return mcpSettingsService.getSettings();
    }

    @PutMapping
    public McpSettingsResponse updateSettings(@RequestBody McpSettingsUpdateRequest request) {
        McpSettingsResponse response = mcpSettingsService.updateSettings(request);
        mcpStreamableServerService.refreshTools();
        return response;
    }

    @PostMapping("/regenerate-token")
    public McpRegenerateTokenResponse regenerateToken() {
        return mcpSettingsService.regenerateToken();
    }

    @GetMapping("/logs")
    public Page<TriggerMcpLog> getLogs(
            @PageableDefault(size = 20, sort = "timestamp", direction = Sort.Direction.DESC) Pageable pageable) {
        return mcpAuditService.getLogs(pageable);
    }
}
