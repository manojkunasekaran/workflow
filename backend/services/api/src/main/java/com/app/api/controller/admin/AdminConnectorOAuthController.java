package com.app.api.controller.admin;

import com.app.api.dto.ConnectorOAuthPlatformConfigDto;
import com.app.api.service.ConnectorOAuthPlatformService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/connectors/{connectorId}/oauth-platform")
@RequiredArgsConstructor
public class AdminConnectorOAuthController {

    private final ConnectorOAuthPlatformService platformOAuthService;

    @GetMapping
    public ConnectorOAuthPlatformConfigDto get(@PathVariable String connectorId) {
        return platformOAuthService.getAdminConfig(connectorId);
    }

    @PutMapping
    public ConnectorOAuthPlatformConfigDto save(
            @PathVariable String connectorId, @RequestBody ConnectorOAuthPlatformConfigDto body) {
        body.setConnectorId(connectorId);
        return platformOAuthService.saveAdminConfig(connectorId, body);
    }
}
