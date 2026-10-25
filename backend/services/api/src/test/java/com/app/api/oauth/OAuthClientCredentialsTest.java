package com.app.api.oauth;

import com.app.common.entity.IntegrationCredential;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class OAuthClientCredentialsTest {

    @Test
    void resolve_prefersCredentialStoredClient() {
        IntegrationCredential credential = new IntegrationCredential();
        credential.setConnectorId("slack");

        OAuthClientCredentials.Resolved resolved = OAuthClientCredentials.resolve(
                credential,
                Map.of(
                        OAuthClientCredentials.CLIENT_ID_KEY,
                        "byo-id",
                        OAuthClientCredentials.CLIENT_SECRET_KEY,
                        "byo-secret"),
                Optional.of(new OAuthClientCredentials.Resolved("platform-id", "platform-secret")));

        assertThat(resolved.clientId()).isEqualTo("byo-id");
        assertThat(resolved.clientSecret()).isEqualTo("byo-secret");
    }

    @Test
    void resolve_fallsBackToPlatformManaged() {
        IntegrationCredential credential = new IntegrationCredential();
        credential.setConnectorId("gmail");

        OAuthClientCredentials.Resolved resolved = OAuthClientCredentials.resolve(
                credential,
                Map.of("access_token", "x"),
                Optional.of(new OAuthClientCredentials.Resolved("managed-id", "managed-secret")));

        assertThat(resolved.clientId()).isEqualTo("managed-id");
        assertThat(resolved.clientSecret()).isEqualTo("managed-secret");
    }
}
