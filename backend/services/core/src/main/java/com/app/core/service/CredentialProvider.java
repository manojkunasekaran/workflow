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
     * Fetches a credential by ID and decrypts its credentials map.
     * This is intended to be called at runtime by TaskExecutors.
     * 
     * @param credentialId The ID of the IntegrationCredential
     * @return Decrypted map of credentials, or empty if not found
     */
    public Optional<Map<String, String>> getDecryptedCredentials(String credentialId) {
        return getDecryptedCredential(credentialId).map(IntegrationCredential::getCredentials);
    }

    /**
     * Fetches a credential by ID and returns the entity with a decrypted credentials map.
     * 
     * @param credentialId The ID of the IntegrationCredential
     * @return The credential with decrypted secrets, or empty if not found
     */
    public Optional<IntegrationCredential> getDecryptedCredential(String credentialId) {
        if (credentialId == null || credentialId.isBlank()) {
            return Optional.empty();
        }

        return repository.findById(credentialId).map(credential -> {
            if (credential.getCredentials() != null) {
                credential.setCredentials(encryptionService.decryptMap(credential.getCredentials()));
            }
            return credential;
        });
    }
}
