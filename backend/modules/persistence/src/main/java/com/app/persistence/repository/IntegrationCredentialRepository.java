package com.app.persistence.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.app.common.entity.IntegrationCredential;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface IntegrationCredentialRepository extends MongoRepository<IntegrationCredential, String> {
    Optional<IntegrationCredential> findByIdAndOrganizationId(String id, String organizationId);

    /**
     * Find all OAuth2 credentials expiring before the given threshold.
     * Used by {@code OAuthTokenRefreshJob} to proactively refresh tokens.
     */
    List<IntegrationCredential> findByTokenTypeAndTokenExpiresAtBefore(String tokenType, Instant threshold);

    List<IntegrationCredential> findByOrganizationId(String organizationId);
    List<IntegrationCredential> findByOrganizationIdAndConnectorId(String organizationId, String connectorId);
    List<IntegrationCredential> findByCredentialScope(com.app.common.entity.CredentialScope credentialScope);
}
