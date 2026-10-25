package com.app.api.controller.admin;

import com.app.api.dto.ConnectorOAuthPlatformConfigDto;
import com.app.api.service.ConnectorOAuthPlatformService;
import com.app.api.service.auth.PlatformAdminAccess;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/connectors/{connectorId}/oauth-platform")
@RequiredArgsConstructor
public class AdminConnectorOAuthController {

    private final ConnectorOAuthPlatformService platformOAuthService;
    private final PlatformAdminAccess platformAdminAccess;

    @GetMapping
    public ConnectorOAuthPlatformConfigDto get(@PathVariable String connectorId) {
        platformAdminAccess.requirePlatformAdmin();
        return platformOAuthService.getAdminConfig(connectorId);
    }

    @PutMapping
    public ConnectorOAuthPlatformConfigDto save(
            @PathVariable String connectorId, @RequestBody ConnectorOAuthPlatformConfigDto body) {
        platformAdminAccess.requirePlatformAdmin();
        body.setConnectorId(connectorId);
        return platformOAuthService.saveAdminConfig(connectorId, body);
    }
}
