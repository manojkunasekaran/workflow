package com.app.api.oauth;

import com.app.common.entity.IntegrationCredential;
import org.springframework.lang.Nullable;

import java.util.Map;
import java.util.Optional;

/** Resolves OAuth client id/secret from user credential (BYO) or platform admin configuration. */
public final class OAuthClientCredentials {

    public static final String CLIENT_ID_KEY = "oauth_client_id";
    public static final String CLIENT_SECRET_KEY = "oauth_client_secret";

    private OAuthClientCredentials() {}

    public record Resolved(@Nullable String clientId, @Nullable String clientSecret) {}

    public static Resolved resolve(
            IntegrationCredential credential,
            Map<String, String> plainCredentialFields,
            Optional<Resolved> platformManaged) {
        String fromCredentialId = plainCredentialFields.get(CLIENT_ID_KEY);
        if (fromCredentialId != null && !fromCredentialId.isBlank()) {
            return new Resolved(fromCredentialId, plainCredentialFields.get(CLIENT_SECRET_KEY));
        }
        return platformManaged.orElseGet(() -> new Resolved(null, null));
    }
}
