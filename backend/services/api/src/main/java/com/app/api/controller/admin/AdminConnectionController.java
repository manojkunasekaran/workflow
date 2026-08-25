package com.app.api.controller.admin;

import com.app.api.service.IntegrationCredentialService;
import com.app.common.entity.IntegrationCredential;
import com.app.common.entity.CredentialScope;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller for managing PLATFORM level connections.
 * These are credentials created by the SaaS administrator that are shared globally as fallbacks.
 */
@RestController
@RequestMapping("/api/v1/admin/connections")
@RequiredArgsConstructor
public class AdminConnectionController {

    private final IntegrationCredentialService credentialService;

    @PostMapping
    public ResponseEntity<IntegrationCredential> createSystemConnection(@RequestBody IntegrationCredential request) {
        request.setCredentialScope(CredentialScope.PLATFORM);
        request.setOrganizationId(null);
        request.setUserId(null);
        return ResponseEntity.ok(credentialService.createCredential(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<IntegrationCredential> updateSystemConnection(@PathVariable String id, @RequestBody IntegrationCredential request) {
        // Assume updateCredential handles mapping fields correctly without overriding scope/org
        return ResponseEntity.ok(credentialService.updateCredential(id, request));
    }

}
