package com.app.core.service;

import com.app.common.entity.IntegrationCredential;
import com.app.crypto.util.EncryptionService;
import com.app.persistence.repository.IntegrationCredentialRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CredentialProvider {

    private final IntegrationCredentialRepository repository;
    private final EncryptionService encryptionService;

    /**
     * Resolves and decrypts a credential. It first tries to find an explicitly passed credential ID.
     * If found, it validates that it belongs to the current org (unless PLATFORM scoped).
     * If no credential ID is provided, it tries to find a fallback (ORG_SHARED then PLATFORM).
     */
    public Optional<Map<String, String>> resolveCredentials(String credentialId, String connectorId, com.app.core.model.ExecutionContext context) {
        return resolveCredential(credentialId, connectorId, context).map(IntegrationCredential::getCredentials);
    }

    public Optional<IntegrationCredential> resolveCredential(String credentialId, String connectorId, com.app.core.model.ExecutionContext context) {
        // Mocking org extraction - in real app comes from ExecutionContext (which should hold tenant info)
        String orgId = "default-org"; 
        String userId = "default-user";

        IntegrationCredential credential = null;

        // 1. If explicit ID provided, fetch and validate access
        if (credentialId != null && !credentialId.isBlank()) {
            credential = repository.findById(credentialId).orElse(null);
            
            if (credential != null) {
                // Access Check
                if (credential.getCredentialScope() == com.app.common.entity.CredentialScope.PLATFORM) {
                    // Platform credentials can be used by anyone
                } else if (!orgId.equals(credential.getOrganizationId())) {
                    log.warn("Security violation: Attempted to use credential from another org. Cred: {}, Request Org: {}", credentialId, orgId);
                    return Optional.empty(); // Deny access
                } else if (credential.getCredentialScope() == com.app.common.entity.CredentialScope.PERSONAL && !userId.equals(credential.getUserId())) {
                    log.warn("Security violation: Attempted to use personal credential of another user.");
                    return Optional.empty(); // Deny access
                }
            }
        } 
        
        // 2. Fallback logic if explicit credential not provided or not found
        if (credential == null && connectorId != null) {
            // Try ORG_SHARED first
            credential = repository.findByOrganizationIdAndConnectorId(orgId, connectorId).stream()
                .filter(c -> c.getCredentialScope() == com.app.common.entity.CredentialScope.ORG_SHARED)
                .findFirst().orElse(null);
                
            // Then try PLATFORM
            if (credential == null) {
                credential = repository.findByCredentialScope(com.app.common.entity.CredentialScope.PLATFORM).stream()
                    .filter(c -> connectorId.equals(c.getConnectorId()))
                    .findFirst().orElse(null);
            }
        }

        // 3. Decrypt and return
        if (credential != null) {
            if (credential.getCredentials() != null) {
                credential.setCredentials(encryptionService.decryptMap(credential.getCredentials()));
            }
            return Optional.of(credential);
        }

        return Optional.empty();
    }
}
