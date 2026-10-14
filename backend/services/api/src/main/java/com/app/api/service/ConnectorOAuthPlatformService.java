package com.app.api.service;

import com.app.api.dto.ConnectorOAuthPlatformConfigDto;
import com.app.api.oauth.OAuthClientCredentials;
import com.app.common.connector.ConnectorAuthType;
import com.app.common.connector.ConnectorManifest;
import com.app.common.connector.ConnectorScope;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.exception.ValidationException;
import com.app.crypto.util.EncryptionService;
import com.app.persistence.connector.ConnectorRegistry;
import com.app.persistence.entity.ConnectorOAuthPlatformConfigEntity;
import com.app.persistence.repository.ConnectorOAuthPlatformConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ConnectorOAuthPlatformService {

    private static final String MASK = "********";

    private final ConnectorOAuthPlatformConfigRepository repository;
    private final ConnectorRegistry connectorRegistry;
    private final EncryptionService encryptionService;

    public Optional<OAuthClientCredentials.Resolved> resolveManagedClient(@NonNull String connectorId) {
        return repository.findByConnectorId(connectorId)
                .filter(ConnectorOAuthPlatformConfigEntity::isEnabled)
                .filter(e -> e.getClientId() != null && !e.getClientId().isBlank())
                .filter(e -> e.getEncryptedClientSecret() != null && !e.getEncryptedClientSecret().isBlank())
                .map(e -> new OAuthClientCredentials.Resolved(
                        e.getClientId(), encryptionService.decrypt(e.getEncryptedClientSecret())));
    }

    public ConnectorOAuthPlatformConfigDto getAdminConfig(@NonNull String connectorId) {
        requireOAuth2SystemConnector(connectorId);
        ConnectorOAuthPlatformConfigDto dto = new ConnectorOAuthPlatformConfigDto();
        dto.setConnectorId(connectorId);
        dto.setEnabled(true);
        dto.setConfigured(false);

        repository.findByConnectorId(connectorId).ifPresent(entity -> {
            dto.setClientId(entity.getClientId());
            dto.setClientSecret(entity.getEncryptedClientSecret() != null ? MASK : null);
            dto.setEnabled(entity.isEnabled());
            dto.setConfigured(
                    entity.getClientId() != null
                            && !entity.getClientId().isBlank()
                            && entity.getEncryptedClientSecret() != null
                            && !entity.getEncryptedClientSecret().isBlank());
        });
        return dto;
    }

    public ConnectorOAuthPlatformConfigDto saveAdminConfig(
            @NonNull String connectorId, @NonNull ConnectorOAuthPlatformConfigDto request) {
        requireOAuth2SystemConnector(connectorId);

        ConnectorOAuthPlatformConfigEntity entity = repository
                .findByConnectorId(connectorId)
                .orElseGet(() -> {
                    ConnectorOAuthPlatformConfigEntity created = new ConnectorOAuthPlatformConfigEntity();
                    created.setId(UUID.randomUUID().toString());
                    created.setConnectorId(connectorId);
                    return created;
                });

        if (request.getClientId() != null && !request.getClientId().isBlank()) {
            entity.setClientId(request.getClientId().trim());
        }
        if (entity.getClientId() == null || entity.getClientId().isBlank()) {
            throw new ValidationException("Client ID is required.");
        }

        if (request.getClientSecret() != null
                && !request.getClientSecret().isBlank()
                && !MASK.equals(request.getClientSecret())) {
            entity.setEncryptedClientSecret(encryptionService.encrypt(request.getClientSecret()));
        } else if (entity.getEncryptedClientSecret() == null || entity.getEncryptedClientSecret().isBlank()) {
            throw new ValidationException("Client secret is required.");
        }
        // MASK or blank secret on update: keep existing encryptedClientSecret

        entity.setEnabled(request.isEnabled());
        repository.save(entity);
        return getAdminConfig(connectorId);
    }

    private void requireOAuth2SystemConnector(String connectorId) {
        ConnectorManifest manifest = connectorRegistry
                .findById(connectorId, null)
                .filter(m -> m.getScope() == ConnectorScope.SYSTEM)
                .orElseThrow(() -> new ResourceNotFoundException("System ConnectorManifest", connectorId));
        if (manifest.getAuthType() != ConnectorAuthType.OAUTH2 || manifest.getOauth2Config() == null) {
            throw new ValidationException("Connector does not use platform-managed OAuth2.");
        }
    }
}
