package com.app.api.job;

import com.app.common.connector.ConnectorManifest;
import com.app.common.connector.OAuth2Config;
import com.app.common.entity.IntegrationCredential;
import com.app.persistence.connector.ConnectorRegistry;
import com.app.persistence.repository.IntegrationCredentialRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Scheduled background job that proactively refreshes expiring OAuth2 tokens.
 *
 * <p>Runs every 15 minutes and refreshes any credential whose {@code tokenExpiresAt}
 * falls within the next 30 minutes. This means tokens are refreshed well before
 * they expire, preventing mid-workflow 401 failures.
 *
 * <p>Connectors that do not return a {@code refresh_token} (e.g. Slack bot tokens)
 * are gracefully skipped — the credential's {@code tokenExpiresAt} will remain null
 * or be absent, so the query will never match them.
 *
 * <p>Uses ShedLock to guarantee only one API instance runs the refresh job at a time
 * in a multi-instance deployment.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OAuthTokenRefreshJob {

    /** Refresh tokens expiring within 30 minutes to give a comfortable safety window. */
    private static final long REFRESH_WINDOW_SECONDS = 1800L;

    private final IntegrationCredentialRepository credentialRepository;
    private final ConnectorRegistry connectorRegistry;
    private final RestTemplate restTemplate;

    @Scheduled(fixedDelayString = "PT15M", initialDelayString = "PT1M")
    @SchedulerLock(name = "oauth_token_refresh", lockAtMostFor = "PT10M", lockAtLeastFor = "PT1M")
    public void refreshExpiringTokens() {
        Instant threshold = Instant.now().plusSeconds(REFRESH_WINDOW_SECONDS);
        List<IntegrationCredential> expiring =
                credentialRepository.findByTokenTypeAndTokenExpiresAtBefore("oauth2", threshold);

        if (expiring.isEmpty()) {
            log.debug("No OAuth2 tokens require refresh.");
            return;
        }

        log.info("Found {} OAuth2 credential(s) requiring refresh.", expiring.size());

        for (IntegrationCredential credential : expiring) {
            try {
                refreshCredential(credential);
            } catch (Exception e) {
                log.error("Failed to refresh OAuth2 token for credential '{}' (connector: {}): {}",
                        credential.getId(), credential.getConnectorId(), e.getMessage(), e);
                // Do not re-throw — attempt remaining credentials
            }
        }
    }

    private void refreshCredential(IntegrationCredential credential) {
        Map<String, String> currentCreds = credential.getCredentials();

        // Skip credentials that have no refresh_token — nothing we can do
        if (currentCreds == null || !currentCreds.containsKey("refresh_token")) {
            log.debug("Credential '{}' has no refresh_token, skipping refresh.", credential.getId());
            // Clear tokenExpiresAt so this credential never appears in the query again
            credential.setTokenExpiresAt(null);
            credentialRepository.save(credential);
            return;
        }

        Optional<ConnectorManifest> manifestOpt = connectorRegistry.findById(credential.getConnectorId());
        if (manifestOpt.isEmpty() || manifestOpt.get().getOauth2Config() == null) {
            log.warn("No OAuth2 manifest found for connector '{}', cannot refresh credential '{}'.",
                    credential.getConnectorId(), credential.getId());
            return;
        }

        OAuth2Config oauth2Config = manifestOpt.get().getOauth2Config();
        String refreshToken = currentCreds.get("refresh_token");

        Map<String, String> body = new HashMap<>();
        body.put("grant_type", "refresh_token");
        body.put("refresh_token", refreshToken);

        HttpHeaders headers = new HttpHeaders();
        headers.set("Accept", "application/json");
        headers.set("Content-Type", "application/x-www-form-urlencoded");

        HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);

        @SuppressWarnings("unchecked")
        ResponseEntity<Map> response = restTemplate.exchange(
                oauth2Config.getTokenUrl(), HttpMethod.POST, request, Map.class);

        @SuppressWarnings("unchecked")
        Map<String, Object> tokenResponse = response.getBody();

        if (tokenResponse == null || !tokenResponse.containsKey("access_token")) {
            log.error("Token refresh for credential '{}' returned invalid response: {}",
                    credential.getId(), tokenResponse);
            return;
        }

        // Merge refreshed fields back into the stored credential map
        Map<String, String> updatedCreds = new HashMap<>(currentCreds);
        tokenResponse.forEach((k, v) -> updatedCreds.put(k, String.valueOf(v)));
        credential.setCredentials(updatedCreds);

        // Update expiry
        Object expiresIn = tokenResponse.get("expires_in");
        if (expiresIn instanceof Number) {
            credential.setTokenExpiresAt(Instant.now().plusSeconds(((Number) expiresIn).longValue()));
        }

        credentialRepository.save(credential);
        log.info("Successfully refreshed OAuth2 token for credential '{}' (connector: {}).",
                credential.getId(), credential.getConnectorId());
    }
}
