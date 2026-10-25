package com.app.api.controller;

import com.app.api.dto.ConnectorTestRequest;
import com.app.api.dto.ConnectorTestResult;
import com.app.api.service.ConnectorTestService;
import com.app.api.service.organization.OrganizationAccess;
import com.app.common.connector.ConnectorManifest;
import com.app.common.connector.ConnectorScope;
import com.app.common.exception.ResourceNotFoundException;
import com.app.persistence.connector.ConnectorRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/connectors")
@RequiredArgsConstructor
public class ConnectorController {

    private final ConnectorRegistry connectorRegistry;
    private final ConnectorTestService connectorTestService;
    private final OrganizationAccess organizationAccess;

    @GetMapping
    public List<ConnectorManifest> listAll() {
        return connectorRegistry.listAll(organizationAccess.requireOrganizationId());
    }

    @GetMapping("/{connectorId}")
    public ConnectorManifest get(@PathVariable String connectorId) {
        return connectorRegistry.findById(connectorId, organizationAccess.requireOrganizationId())
                .orElseThrow(() -> new ResourceNotFoundException("ConnectorManifest", connectorId));
    }

    @PostMapping
    public ConnectorManifest create(@RequestBody ConnectorManifest manifest) {
        String organizationId = organizationAccess.requireOrganizationId();
        manifest.setScope(ConnectorScope.ORGANIZATION);
        manifest.setOrganizationId(organizationId);
        return connectorRegistry.save(manifest);
    }

    @PutMapping("/{connectorId}")
    public ConnectorManifest update(@PathVariable String connectorId, @RequestBody ConnectorManifest manifest) {
        ConnectorManifest existing = get(connectorId);
        String organizationId = organizationAccess.requireOrganizationId();
        if (existing.getScope() != ConnectorScope.ORGANIZATION
                || !organizationId.equals(existing.getOrganizationId())) {
            throw new IllegalArgumentException(
                    "Cannot modify system connectors or connectors from another organization");
        }
        manifest.setId(existing.getId());
        manifest.setConnectorId(connectorId);
        manifest.setScope(ConnectorScope.ORGANIZATION);
        manifest.setOrganizationId(organizationId);
        return connectorRegistry.save(manifest);
    }

    @DeleteMapping("/{connectorId}")
    public void delete(@PathVariable String connectorId) {
        ConnectorManifest existing = get(connectorId);
        String organizationId = organizationAccess.requireOrganizationId();
        if (existing.getScope() != ConnectorScope.ORGANIZATION
                || !organizationId.equals(existing.getOrganizationId())) {
            throw new IllegalArgumentException(
                    "Cannot delete system connectors or connectors from another organization");
        }
        connectorRegistry.delete(existing.getId());
    }

    @PostMapping("/{connectorId}/test")
    public ResponseEntity<ConnectorTestResult> testAction(
            @PathVariable String connectorId,
            @RequestBody ConnectorTestRequest request) {
        ConnectorTestResult result = connectorTestService.testAction(connectorId, request);
        return ResponseEntity.ok(result);
    }
}
