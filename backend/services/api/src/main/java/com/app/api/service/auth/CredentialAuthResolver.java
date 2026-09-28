package com.app.api.service.auth;

import com.app.common.connector.ConnectorAuthType;
import com.app.common.connector.ConnectorManifest;
import com.app.common.connector.OAuth2Config;
import com.app.common.entity.IntegrationCredential;
import com.app.crypto.util.EncryptionService;
import com.app.persistence.connector.ConnectorRegistry;
import com.app.persistence.repository.IntegrationCredentialRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * Resolves integration credentials and applies auth headers for HTTP requests.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CredentialAuthResolver {

    private static final String DEFAULT_ORG_ID = "default-org";
    private static final long REFRESH_WINDOW_SECONDS = 300L;

    private final IntegrationCredentialRepository credentialRepository;
    private final ConnectorRegistry connectorRegistry;
    private final EncryptionService encryptionService;
    private final RestTemplate restTemplate;
    private final Environment environment;

    public void applyAuth(String credentialId, HttpHeaders headers) {
        if (credentialId == null || credentialId.isBlank()) {
            return;
        }

        IntegrationCredential credential = credentialRepository.findById(credentialId)
                .orElseThrow(() -> new IllegalArgumentException("Credential not found: " + credentialId));

        Map<String, String> creds = decryptCredentials(credential);
        if (creds == null) {
            return;
        }

        refreshOAuthIfNeeded(credential, creds);

        if (credential.getConnectorId() != null && !credential.getConnectorId().isBlank()) {
            connectorRegistry.findById(credential.getConnectorId(), DEFAULT_ORG_ID)
                    .ifPresent(manifest -> applyManifestAuth(manifest, creds, headers));
            return;
        }

        applyGenericAuth(credential.getType(), creds, headers);
    }

    private Map<String, String> decryptCredentials(IntegrationCredential credential) {
        Map<String, String> rawCreds = credential.getCredentials();
        if (rawCreds == null) {
            return null;
        }
        return encryptionService.decryptMap(rawCreds);
    }

    private void refreshOAuthIfNeeded(IntegrationCredential credential, Map<String, String> creds) {
        if (credential.getTokenExpiresAt() == null) {
            return;
        }
        Instant threshold = Instant.now().plusSeconds(REFRESH_WINDOW_SECONDS);
        if (credential.getTokenExpiresAt().isAfter(threshold)) {
            return;
        }
        if (!creds.containsKey("refresh_token") || credential.getConnectorId() == null) {
            return;
        }

        connectorRegistry.findById(credential.getConnectorId(), DEFAULT_ORG_ID)
                .ifPresent(manifest -> refreshOAuthToken(credential, creds, manifest));
    }

    @SuppressWarnings("unchecked")
    private void refreshOAuthToken(
            IntegrationCredential credential,
            Map<String, String> creds,
            ConnectorManifest manifest) {
        OAuth2Config oauth2Config = manifest.getOauth2Config();
        if (oauth2Config == null || oauth2Config.getTokenUrl() == null) {
            return;
        }

        String clientId = environment.getProperty(
                "workflow.connectors." + credential.getConnectorId() + ".client-id");
        String clientSecret = environment.getProperty(
                "workflow.connectors." + credential.getConnectorId() + ".client-secret");

        Map<String, String> body = new HashMap<>();
        body.put("grant_type", "refresh_token");
        body.put("refresh_token", creds.get("refresh_token"));
        if (clientId != null && clientSecret != null) {
            body.put("client_id", clientId);
            body.put("client_secret", clientSecret);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.set("Accept", "application/json");
        headers.set("Content-Type", "application/x-www-form-urlencoded");

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    oauth2Config.getTokenUrl(), HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
            Map<String, Object> tokenResponse = response.getBody();
            if (tokenResponse == null || !tokenResponse.containsKey("access_token")) {
                log.warn("OAuth refresh for credential '{}' returned no access_token", credential.getId());
                return;
            }

            tokenResponse.forEach((k, v) -> creds.put(k, String.valueOf(v)));
            Object expiresIn = tokenResponse.get("expires_in");
            if (expiresIn instanceof Number) {
                credential.setTokenExpiresAt(Instant.now().plusSeconds(((Number) expiresIn).longValue()));
            }
            credentialRepository.save(credential);
            log.info("Refreshed OAuth token for credential '{}'", credential.getId());
        } catch (Exception e) {
            log.warn("Failed to refresh OAuth token for credential '{}': {}", credential.getId(), e.getMessage());
        }
    }

    private void applyManifestAuth(ConnectorManifest manifest, Map<String, String> creds, HttpHeaders headers) {
        if (manifest.getAuthType() == ConnectorAuthType.NONE) {
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
            case BASIC_AUTH -> applyBasicAuth(creds, headers);
            case OAUTH2, CUSTOM_HEADER -> {
                if (manifest.getAuthType() == ConnectorAuthType.OAUTH2 && creds.containsKey("access_token")) {
                    headers.add(HttpHeaders.AUTHORIZATION, "Bearer " + creds.get("access_token"));
                } else {
                    creds.forEach(headers::add);
                }
            }
            default -> applyGenericAuth(manifest.getAuthType() != null ? manifest.getAuthType().name() : null, creds, headers);
        }
    }

    private void applyGenericAuth(String type, Map<String, String> creds, HttpHeaders headers) {
        if (type == null) {
            if (creds.containsKey("access_token")) {
                headers.add(HttpHeaders.AUTHORIZATION, "Bearer " + creds.get("access_token"));
            } else if (creds.containsKey("token")) {
                headers.add(HttpHeaders.AUTHORIZATION, "Bearer " + creds.get("token"));
            }
            return;
        }
        switch (type.toUpperCase()) {
            case "BEARER", "BEARER_TOKEN" -> {
                if (creds.get("token") != null) {
                    headers.add(HttpHeaders.AUTHORIZATION, "Bearer " + creds.get("token"));
                }
            }
            case "API_KEY" -> {
                if (creds.get("apiKey") != null) {
                    headers.add("X-API-Key", creds.get("apiKey"));
                }
            }
            case "BASIC", "BASIC_AUTH" -> applyBasicAuth(creds, headers);
            case "OAUTH2" -> {
                if (creds.get("access_token") != null) {
                    headers.add(HttpHeaders.AUTHORIZATION, "Bearer " + creds.get("access_token"));
                }
            }
            default -> creds.forEach(headers::add);
        }
    }

    private void applyBasicAuth(Map<String, String> creds, HttpHeaders headers) {
        String username = creds.get("username");
        String password = creds.get("password");
        if (username != null && password != null) {
            String encoded = Base64.getEncoder().encodeToString((username + ":" + password).getBytes());
            headers.add(HttpHeaders.AUTHORIZATION, "Basic " + encoded);
        }
    }
}
