package com.app.api.service;

import com.app.common.connector.ConnectorManifest;
import com.app.common.connector.VerifyAction;
import com.app.common.connector.ConnectorAuthType;
import com.app.common.entity.IntegrationCredential;
import com.app.crypto.util.EncryptionService;
import com.app.persistence.connector.ConnectorRegistry;
import com.app.persistence.repository.IntegrationCredentialRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
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
    private final ConnectorRegistry connectorRegistry;
    private final RestTemplate restTemplate;
    
    // In a multi-tenant app, this would come from the security context
    private static final String DEFAULT_ORG_ID = "default-org";

    public IntegrationCredential createCredential(@NonNull IntegrationCredential credential) {
        if (credential.getId() == null) {
            credential.setId(UUID.randomUUID().toString());
        }
        
        if (credential.getCredentialScope() == com.app.common.entity.CredentialScope.PLATFORM) {
            credential.setOrganizationId(null);
            credential.setUserId(null);
        } else {
            credential.setOrganizationId(DEFAULT_ORG_ID); // In real app, from Context
            // credential.setUserId(DEFAULT_USER_ID);
        }
        
        // Encrypt the credentials map before saving
        if (credential.getCredentials() != null) {
            credential.setCredentials(encryptionService.encryptMap(credential.getCredentials()));
        }
        
        IntegrationCredential saved = repository.save(credential);
        return maskCredentials(saved);
    }
    
    private IntegrationCredential findAndVerifyAccess(String id) {
        IntegrationCredential credential = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Credential not found"));
                
        if (credential.getCredentialScope() != com.app.common.entity.CredentialScope.PLATFORM) {
            if (!DEFAULT_ORG_ID.equals(credential.getOrganizationId())) {
                throw new IllegalArgumentException("Credential not found or access denied");
            }
        }
        return credential;
    }

    public IntegrationCredential updateCredential(@NonNull String id, @NonNull IntegrationCredential updateRequest) {
        IntegrationCredential existing = findAndVerifyAccess(id);
                
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
        return repository.findByOrganizationId(DEFAULT_ORG_ID).stream()
                .map(this::maskCredentials)
                .collect(Collectors.toList());
    }

    public List<IntegrationCredential> getCredentialsByConnector(@NonNull String connectorId) {
        return repository.findByOrganizationIdAndConnectorId(DEFAULT_ORG_ID, connectorId).stream()
                .map(this::maskCredentials)
                .collect(Collectors.toList());
    }

    public Optional<IntegrationCredential> getCredentialById(@NonNull String id) {
        try {
            return Optional.of(maskCredentials(findAndVerifyAccess(id)));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public void deleteCredential(@NonNull String id) {
        try {
            repository.delete(findAndVerifyAccess(id));
        } catch (IllegalArgumentException e) {
            // ignore
        }
    }
    
    /**
     * Verifies the connection by making a call to the verifyAction endpoint.
     */
    public IntegrationCredential verifyConnection(@NonNull String id) {
        IntegrationCredential credential = findAndVerifyAccess(id);
        
        Optional<ConnectorManifest> manifestOpt = connectorRegistry.findById(credential.getConnectorId());
        if (manifestOpt.isEmpty()) {
            credential.setConnectionStatus(com.app.common.entity.ConnectionStatus.ERROR);
            return maskCredentials(repository.save(credential));
        }
        
        ConnectorManifest manifest = manifestOpt.get();
        VerifyAction verifyAction = manifest.getVerifyAction();
        
        if (verifyAction == null || verifyAction.getPath() == null || verifyAction.getPath().isBlank()) {
            // No verify action defined, assume active
            credential.setConnectionStatus(com.app.common.entity.ConnectionStatus.ACTIVE);
            credential.setConnectedAs("Verified Account");
            return maskCredentials(repository.save(credential));
        }
        
        try {
            String url = manifest.getBaseUrl() + verifyAction.getPath();
            HttpHeaders headers = new HttpHeaders();
            if (verifyAction.getHeaders() != null) {
                verifyAction.getHeaders().forEach(headers::add);
            }
            
            Map<String, String> plainCreds = encryptionService.decryptMap(credential.getCredentials());
            applyAuth(manifest, plainCreds, headers);
            
            HttpEntity<?> request = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(
                    url, 
                    HttpMethod.valueOf(verifyAction.getMethod().toUpperCase()), 
                    request, 
                    String.class
            );
            
            if (response.getStatusCode().is2xxSuccessful()) {
                credential.setConnectionStatus(com.app.common.entity.ConnectionStatus.ACTIVE);
                credential.setConnectedAs("Verified Account");
            } else {
                credential.setConnectionStatus(com.app.common.entity.ConnectionStatus.ERROR);
            }
        } catch (HttpClientErrorException e) {
            log.error("Failed to verify connection {}: HTTP {}", credential.getId(), e.getStatusCode());
            if (e.getStatusCode().is4xxClientError()) {
                credential.setConnectionStatus(com.app.common.entity.ConnectionStatus.REVOKED);
            } else {
                credential.setConnectionStatus(com.app.common.entity.ConnectionStatus.ERROR);
            }
        } catch (Exception e) {
            log.error("Failed to verify connection {}", credential.getId(), e);
            credential.setConnectionStatus(com.app.common.entity.ConnectionStatus.ERROR);
        }
        
        return maskCredentials(repository.save(credential));
    }
    
    private void applyAuth(ConnectorManifest manifest, Map<String, String> creds, HttpHeaders headers) {
        if (manifest.getAuthType() == ConnectorAuthType.NONE || creds == null) {
            return;
        }

        switch (manifest.getAuthType()) {
            case BEARER_TOKEN -> {
                String token = creds.get("token");
                if (token != null) {
                    String prefix = manifest.getAuthHeaderPrefix() != null ? manifest.getAuthHeaderPrefix() : "Bearer ";
                    headers.add(HttpHeaders.AUTHORIZATION, prefix + token);
                }
            }
            case API_KEY -> {
                String headerName = manifest.getAuthHeaderName();
                if (headerName != null && creds.get("apiKey") != null) {
                    headers.add(headerName, creds.get("apiKey"));
                }
            }
            case BASIC_AUTH -> {
                String username = creds.get("username");
                String password = creds.get("password");
                if (username != null && password != null) {
                    String encoded = Base64.getEncoder().encodeToString(
                            (username + ":" + password).getBytes());
                    headers.add(HttpHeaders.AUTHORIZATION, "Basic " + encoded);
                }
            }
            case CUSTOM_HEADER, OAUTH2 -> {
                if (manifest.getAuthType() == ConnectorAuthType.OAUTH2 && creds.containsKey("access_token")) {
                    headers.add(HttpHeaders.AUTHORIZATION, "Bearer " + creds.get("access_token"));
                } else {
                    creds.forEach(headers::add);
                }
            }
        }
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
        masked.setConnectionStatus(original.getConnectionStatus());
        masked.setConnectedAs(original.getConnectedAs());
        masked.setUserId(original.getUserId());
        masked.setLastUsedAt(original.getLastUsedAt());
        masked.setCredentialScope(original.getCredentialScope());
        
        if (original.getCredentials() != null) {
            Map<String, String> maskedMap = new HashMap<>();
            original.getCredentials().keySet().forEach(k -> maskedMap.put(k, "********"));
            masked.setCredentials(maskedMap);
        }
        return masked;
    }
}
