package com.app.api.service;

import com.app.common.entity.IntegrationCredential;
import com.app.crypto.util.EncryptionService;
import com.app.persistence.repository.IntegrationCredentialRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class IntegrationCredentialService {

    private final IntegrationCredentialRepository repository;
    private final EncryptionService encryptionService;
    
    // In a multi-tenant app, this would come from the security context
    private static final String DEFAULT_ORG_ID = "default-org";

    public IntegrationCredential createCredential(@NonNull IntegrationCredential credential) {
        if (credential.getId() == null) {
            credential.setId(UUID.randomUUID().toString());
        }
        credential.setOrganizationId(DEFAULT_ORG_ID);
        
        // Encrypt the credentials map before saving
        if (credential.getCredentials() != null) {
            credential.setCredentials(encryptionService.encryptMap(credential.getCredentials()));
        }
        
        IntegrationCredential saved = repository.save(credential);
        return maskCredentials(saved);
    }
    
    public IntegrationCredential updateCredential(@NonNull String id, @NonNull IntegrationCredential updateRequest) {
        IntegrationCredential existing = repository.findByIdAndOrganizationId(id, DEFAULT_ORG_ID)
                .orElseThrow(() -> new IllegalArgumentException("Credential not found"));
                
        existing.setName(updateRequest.getName());
        
        // If the update request provides new credentials, we must encrypt them.
        // The frontend will send actual values if updated, or an empty map if unchanged,
        // or a map with masked values. We only update fields that are not masked.
        if (updateRequest.getCredentials() != null) {
            Map<String, String> currentEncrypted = existing.getCredentials();
            Map<String, String> newRaw = updateRequest.getCredentials();
            
            Map<String, String> updatedEncrypted = new HashMap<>(currentEncrypted != null ? currentEncrypted : new HashMap<>());
            
            for (Map.Entry<String, String> entry : newRaw.entrySet()) {
                String key = entry.getKey();
                String val = entry.getValue();
                
                // If the frontend sends back the mask, it means the user didn't change it.
                if (val != null && !val.equals("********") && !val.isBlank()) {
                    updatedEncrypted.put(key, encryptionService.encrypt(val));
                }
            }
            existing.setCredentials(updatedEncrypted);
        }
        
        IntegrationCredential saved = repository.save(existing);
        return maskCredentials(saved);
    }

    public List<IntegrationCredential> getAllCredentials() {
        return repository.findAll().stream()
                .filter(c -> DEFAULT_ORG_ID.equals(c.getOrganizationId()))
                .map(this::maskCredentials)
                .collect(Collectors.toList());
    }

    public List<IntegrationCredential> getCredentialsByConnector(@NonNull String connectorId) {
        return repository.findAll().stream()
                .filter(c -> DEFAULT_ORG_ID.equals(c.getOrganizationId()))
                .filter(c -> connectorId.equals(c.getConnectorId()))
                .map(this::maskCredentials)
                .collect(Collectors.toList());
    }

    public Optional<IntegrationCredential> getCredentialById(@NonNull String id) {
        return repository.findByIdAndOrganizationId(id, DEFAULT_ORG_ID)
                .map(this::maskCredentials);
    }

    public void deleteCredential(@NonNull String id) {
        repository.findByIdAndOrganizationId(id, DEFAULT_ORG_ID)
                .ifPresent(repository::delete);
    }
    
    /**
     * Masks the credentials map for returning to the UI.
     * We don't send the encrypted strings to the UI either, just a mask.
     */
    private IntegrationCredential maskCredentials(IntegrationCredential original) {
        IntegrationCredential masked = new IntegrationCredential();
        masked.setId(original.getId());
        masked.setOrganizationId(original.getOrganizationId());
        masked.setName(original.getName());
        masked.setType(original.getType());
        masked.setConnectorId(original.getConnectorId());
        masked.setCreatedAt(original.getCreatedAt());
        masked.setUpdatedAt(original.getUpdatedAt());
        
        if (original.getCredentials() != null) {
            Map<String, String> maskedMap = new HashMap<>();
            original.getCredentials().keySet().forEach(k -> maskedMap.put(k, "********"));
            masked.setCredentials(maskedMap);
        }
        return masked;
    }
}
