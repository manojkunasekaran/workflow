package com.app.api.controller.admin;

import com.app.common.connector.ConnectorManifest;
import com.app.common.connector.ConnectorScope;
import com.app.persistence.connector.ConnectorRegistry;
import com.app.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/connectors")
@RequiredArgsConstructor
public class AdminConnectorController {

    private final ConnectorRegistry connectorRegistry;

    @GetMapping
    public List<ConnectorManifest> listAll() {
        return connectorRegistry.listAll().stream()
                .filter(m -> m.getScope() == ConnectorScope.SYSTEM)
                .collect(Collectors.toList());
    }

    @GetMapping("/{connectorId}")
    public ConnectorManifest get(@PathVariable String connectorId) {
        return connectorRegistry.findById(connectorId, null)
                .filter(m -> m.getScope() == ConnectorScope.SYSTEM)
                .orElseThrow(() -> new ResourceNotFoundException("System ConnectorManifest", connectorId));
    }
    
    @PostMapping
    public ConnectorManifest create(@RequestBody ConnectorManifest manifest) {
        manifest.setScope(ConnectorScope.SYSTEM);
        manifest.setOrganizationId(null); // Force system scope
        return connectorRegistry.save(manifest);
    }
    
    @PutMapping("/{connectorId}")
    public ConnectorManifest update(@PathVariable String connectorId, @RequestBody ConnectorManifest manifest) {
        ConnectorManifest existing = get(connectorId); // Validates it exists and is SYSTEM
        manifest.setId(existing.getId());
        manifest.setConnectorId(connectorId);
        manifest.setScope(ConnectorScope.SYSTEM);
        manifest.setOrganizationId(null);
        return connectorRegistry.save(manifest);
    }
    
    @DeleteMapping("/{connectorId}")
    public void delete(@PathVariable String connectorId) {
        ConnectorManifest existing = get(connectorId);
        connectorRegistry.delete(existing.getId());
    }
}
