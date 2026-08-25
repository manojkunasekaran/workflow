package com.app.api.controller;

import com.app.common.entity.IntegrationCredential;
import com.app.common.exception.ResourceNotFoundException;
import com.app.api.service.IntegrationCredentialService;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.lang.NonNull;
import java.util.List;

@RestController
@RequestMapping("/credentials")
@RequiredArgsConstructor
public class IntegrationCredentialController {

    private final IntegrationCredentialService service;

    @PostMapping
    public IntegrationCredential create(@NonNull @RequestBody IntegrationCredential credential) {
        // If an ID is provided, treat it as an update
        if (credential.getId() != null && !credential.getId().isBlank()) {
            return service.updateCredential(credential.getId(), credential);
        }
        return service.createCredential(credential);
    }

    @GetMapping
    public List<IntegrationCredential> list(@RequestParam(required = false) String connectorId) {
        if (connectorId != null && !connectorId.isBlank()) {
            return service.getCredentialsByConnector(connectorId);
        }
        return service.getAllCredentials();
    }

    @GetMapping("/{id}")
    public IntegrationCredential get(@NonNull @PathVariable String id) {
        return service.getCredentialById(id)
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationCredential", id));
    }

    @DeleteMapping("/{id}")
    public void delete(@NonNull @PathVariable String id) {
        if (service.getCredentialById(id).isEmpty()) {
            throw new ResourceNotFoundException("IntegrationCredential", id);
        }
        service.deleteCredential(id);
    }
    
    @PostMapping("/{id}/verify")
    public IntegrationCredential verify(@NonNull @PathVariable String id) {
        return service.verifyConnection(id);
    }
}
