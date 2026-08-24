package com.app.api.job;

import com.app.common.connector.ConnectorManifest;
import com.app.common.connector.OAuth2Config;
import com.app.common.entity.IntegrationCredential;
import com.app.persistence.connector.ConnectorRegistry;
import com.app.persistence.repository.IntegrationCredentialRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OAuthTokenRefreshJobTest {

    @Mock
    private IntegrationCredentialRepository credentialRepository;
    @Mock
    private ConnectorRegistry connectorRegistry;
    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private OAuthTokenRefreshJob refreshJob;

    @Captor
    private ArgumentCaptor<IntegrationCredential> credentialCaptor;

    private IntegrationCredential credential;
    private ConnectorManifest manifest;

    @BeforeEach
    void setUp() {
        credential = new IntegrationCredential();
        credential.setId("cred-1");
        credential.setConnectorId("slack");
        credential.setTokenType("oauth2");
        credential.setTokenExpiresAt(Instant.now().plusSeconds(600)); // expiring soon
        
        Map<String, String> creds = new HashMap<>();
        creds.put("access_token", "old-token");
        creds.put("refresh_token", "refresh-token-123");
        credential.setCredentials(creds);

        manifest = new ConnectorManifest();
        manifest.setConnectorId("slack");
        OAuth2Config oauthConfig = new OAuth2Config();
        oauthConfig.setTokenUrl("https://slack.com/api/oauth.v2.access");
        manifest.setOauth2Config(oauthConfig);
    }

    @Test
    void refreshExpiringTokens_shouldSuccessfullyRefreshTokens() {
        when(credentialRepository.findByTokenTypeAndTokenExpiresAtBefore(eq("oauth2"), any(Instant.class)))
                .thenReturn(List.of(credential));
        when(connectorRegistry.findById("slack")).thenReturn(Optional.of(manifest));

        Map<String, Object> tokenResponse = new HashMap<>();
        tokenResponse.put("access_token", "new-token");
        tokenResponse.put("expires_in", 3600); // 1 hour
        ResponseEntity<Map> responseEntity = new ResponseEntity<>(tokenResponse, HttpStatus.OK);
        
        when(restTemplate.exchange(
                eq("https://slack.com/api/oauth.v2.access"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(Map.class)
        )).thenReturn(responseEntity);

        refreshJob.refreshExpiringTokens();

        verify(credentialRepository, times(1)).save(credentialCaptor.capture());
        IntegrationCredential saved = credentialCaptor.getValue();
        
        assertThat(saved.getCredentials().get("access_token")).isEqualTo("new-token");
        assertThat(saved.getCredentials().get("refresh_token")).isEqualTo("refresh-token-123"); // preserved
        assertThat(saved.getTokenExpiresAt()).isAfter(Instant.now().plusSeconds(3500)); // ~1 hour in future
    }

    @Test
    void refreshExpiringTokens_shouldSkipIfNoRefreshTokenIsPresent() {
        credential.getCredentials().remove("refresh_token");
        
        when(credentialRepository.findByTokenTypeAndTokenExpiresAtBefore(eq("oauth2"), any(Instant.class)))
                .thenReturn(List.of(credential));

        refreshJob.refreshExpiringTokens();

        verify(credentialRepository, times(1)).save(credentialCaptor.capture());
        IntegrationCredential saved = credentialCaptor.getValue();
        
        // Token expires at should be cleared so it's never picked up again
        assertThat(saved.getTokenExpiresAt()).isNull();
        
        verify(restTemplate, never()).exchange(anyString(), any(), any(), eq(Map.class));
    }

    @Test
    void refreshExpiringTokens_shouldHandleApiErrorsGracefully() {
        when(credentialRepository.findByTokenTypeAndTokenExpiresAtBefore(eq("oauth2"), any(Instant.class)))
                .thenReturn(List.of(credential));
        when(connectorRegistry.findById("slack")).thenReturn(Optional.of(manifest));

        when(restTemplate.exchange(anyString(), any(), any(), eq(Map.class)))
                .thenThrow(new RuntimeException("API is down"));

        // Should NOT throw an exception, it should catch and log it
        refreshJob.refreshExpiringTokens();

        // Save should not be called because it failed
        verify(credentialRepository, never()).save(any());
    }
}
