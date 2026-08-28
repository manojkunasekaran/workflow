package com.app.common.entity;

import com.app.common.constant.CollectionNames;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Short-lived document that links an OAuth2 CSRF state token to the
 * connector + organization context during the authorization code flow.
 *
 * <p>MongoDB automatically deletes documents once {@code expiresAt} is reached
 * (requires a TTL index on the field — created via {@code @Indexed(expireAfterSeconds = 0)}).
 */
@Data
@Document(collection = CollectionNames.OAUTH_STATES)
public class OAuthState {

    @Id
    private String id; // used as the OAuth2 `state` query parameter

    /** The connector that initiated the OAuth flow (e.g. "slack", "gmail"). */
    private String connectorId;

    /**
     * Organization that initiated the flow. Stored here so the resulting
     * credential is saved against the correct tenant even after the redirect.
     */
    private String organizationId;

    /**
     * Optional — where the frontend should navigate after a successful OAuth
     * exchange (defaults to /credentials on the frontend).
     */
    private String returnUrl;

    /**
     * TTL field. MongoDB deletes this document automatically once this
     * instant is in the past. Set to 10 minutes from creation.
     */
    @Indexed(expireAfterSeconds = 0)
    private Instant expiresAt;

    /** Optional custom OAuth overrides (BYO App) */
    private String customClientId;
    private String customClientSecret;
    private String customScopes;
    private String allowedDomains;
}
