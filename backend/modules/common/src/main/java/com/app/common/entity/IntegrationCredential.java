package com.app.common.entity;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.mongodb.core.mapping.Document;

import com.app.common.constant.CollectionNames;
import com.app.common.model.base.BaseModel;

import java.time.Instant;
import java.util.Map;

@Data
@EqualsAndHashCode(callSuper = true)
@Document(collection = CollectionNames.INTEGRATION_CREDENTIALS)
public class IntegrationCredential extends BaseModel {
    private String organizationId;
    private String connectorId; // Optional: Link to a specific connector
    private String name;
    private String type;
    private Map<String, String> credentials;

    /**
     * For OAuth2 credentials — the instant the access_token expires.
     * Null for non-expiring credential types (API keys, Bearer tokens, etc.).
     * Used by {@code OAuthTokenRefreshJob} to proactively refresh tokens.
     */
    private Instant tokenExpiresAt;

    /**
     * Discriminator used by the token refresh scheduler.
     * Set to {@code "oauth2"} for credentials created through the OAuth2 flow.
     * Null for all other credential types.
     */
    private String tokenType;
}