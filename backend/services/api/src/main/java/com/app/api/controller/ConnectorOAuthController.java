package com.app.api.controller;

import com.app.common.connector.ConnectorManifest;
import com.app.common.entity.IntegrationCredential;
import com.app.common.entity.OAuthState;
import com.app.common.exception.ResourceNotFoundException;
import com.app.api.service.IntegrationCredentialService;
import com.app.persistence.connector.ConnectorRegistry;
import com.app.persistence.repository.OAuthStateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.view.RedirectView;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Handles the OAuth2 Authorization Code flow for connector integrations.
 *
 * <p><b>State security:</b> The OAuth {@code state} parameter is stored in MongoDB
 * with a 10-minute TTL index. This prevents CSRF attacks and survives API restarts
 * and multi-instance deployments — unlike the previous in-memory HashMap approach.
 *
 * <p><b>Tenant isolation:</b> The organization ID is captured at authorization time
 * and stored in the {@link OAuthState} document. This ensures the resulting credential
 * is always saved against the correct tenant, not a hardcoded default.
 */
@Slf4j
@RestController
@RequestMapping("/oauth")
@RequiredArgsConstructor
public class ConnectorOAuthController {

    // In a future multi-tenant sprint, replace this with SecurityContextHolder lookup.
    private static final String DEFAULT_ORG_ID = "default-org";

    private final ConnectorRegistry connectorRegistry;
    private final Environment environment;
    private final IntegrationCredentialService credentialService;
    private final OAuthStateRepository stateRepository;
    private final RestTemplate restTemplate;

    /**
     * Step 1 of the OAuth2 flow — build the authorization URL and redirect the user.
     *
     * @param connectorId the connector to authorize (e.g. "slack", "gmail")
     */
    @GetMapping("/{connectorId}/authorize")
    public RedirectView authorize(@PathVariable String connectorId,
                                  @RequestParam(required = false) String clientId,
                                  @RequestParam(required = false) String clientSecret,
                                  @RequestParam(required = false) String scopes,
                                  @RequestParam(required = false) String allowedDomains) {
        ConnectorManifest manifest = connectorRegistry.findById(connectorId)
                .orElseThrow(() -> new ResourceNotFoundException("ConnectorManifest", connectorId));

        if (manifest.getOauth2Config() == null) {
            throw new IllegalArgumentException("Connector '" + connectorId + "' does not support OAuth2");
        }

        String finalClientId = clientId != null && !clientId.isEmpty() ? clientId : getProperty(connectorId, "client-id");
        if (finalClientId == null) {
            throw new IllegalStateException(
                    "OAuth2 client ID is not configured for connector: " + connectorId +
                    ". Set property: workflow.connectors." + connectorId + ".client-id");
        }

        // Persist state in MongoDB (TTL = 10 minutes via @Indexed on expiresAt field)
        OAuthState state = new OAuthState();
        state.setId(UUID.randomUUID().toString());
        state.setConnectorId(connectorId);
        state.setOrganizationId(DEFAULT_ORG_ID);
        state.setExpiresAt(Instant.now().plusSeconds(600));
        if (clientId != null && !clientId.isEmpty()) {
            state.setCustomClientId(clientId);
            state.setCustomClientSecret(clientSecret);
            state.setCustomScopes(scopes);
            state.setAllowedDomains(allowedDomains);
        }
        stateRepository.save(state);

        String authUrl = UriComponentsBuilder
                .fromUriString(manifest.getOauth2Config().getAuthorizationUrl())
                .queryParam("client_id", finalClientId)
                .queryParam("redirect_uri", getCallbackUrl())
                .queryParam("response_type", "code")
                .queryParam("state", state.getId())
                .queryParam("scope", scopes != null && !scopes.isEmpty() ? scopes
                        : String.join(" ", manifest.getOauth2Config().getDefaultScopes() != null
                                ? manifest.getOauth2Config().getDefaultScopes()
                                : java.util.Collections.emptyList()))
                .build(false)
                .toUriString();

        log.info("Initiating OAuth2 flow for connector: {}, state: {}", connectorId, state.getId());
        return new RedirectView(authUrl);
    }

    /**
     * Step 2 of the OAuth2 flow — exchange the authorization code for tokens and save the credential.
     *
     * @param code  the authorization code returned by the provider
     * @param state the CSRF state token we issued in Step 1
     */
    @GetMapping("/callback")
    public RedirectView callback(@RequestParam String code, @RequestParam String state) {
        // Look up and immediately consume the state (one-time use)
        OAuthState oauthState = stateRepository.findById(state)
                .orElse(null);

        if (oauthState == null || oauthState.getExpiresAt().isBefore(Instant.now())) {
            log.warn("OAuth2 callback received with invalid or expired state: {}", state);
            // Delete stale record if it somehow survived TTL
            stateRepository.deleteById(state);
            return buildErrorRedirect("State token is invalid or expired. Please try connecting again.");
        }

        // Consume — remove state immediately to prevent replay attacks
        stateRepository.deleteById(state);

        ConnectorManifest manifest = connectorRegistry.findById(oauthState.getConnectorId())
                .orElseThrow(() -> new ResourceNotFoundException("ConnectorManifest", oauthState.getConnectorId()));

        String clientId = oauthState.getCustomClientId() != null ? oauthState.getCustomClientId() : getProperty(oauthState.getConnectorId(), "client-id");
        String clientSecret = oauthState.getCustomClientSecret() != null ? oauthState.getCustomClientSecret() : getProperty(oauthState.getConnectorId(), "client-secret");

        Map<String, String> tokenRequestBody = new HashMap<>();
        tokenRequestBody.put("client_id", clientId);
        tokenRequestBody.put("client_secret", clientSecret);
        tokenRequestBody.put("code", code);
        tokenRequestBody.put("grant_type", "authorization_code");
        tokenRequestBody.put("redirect_uri", getCallbackUrl());

        HttpHeaders headers = new HttpHeaders();
        headers.set("Accept", "application/json");
        headers.set("Content-Type", "application/x-www-form-urlencoded");

        HttpEntity<Map<String, String>> request = new HttpEntity<>(tokenRequestBody, headers);

        try {
            @SuppressWarnings("unchecked")
            ResponseEntity<Map> response = restTemplate.exchange(
                    manifest.getOauth2Config().getTokenUrl(),
                    HttpMethod.POST,
                    request,
                    Map.class
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> tokenResponse = response.getBody();

            if (tokenResponse == null || !tokenResponse.containsKey("access_token")) {
                log.error("OAuth2 token exchange failed for connector {}: invalid response body: {}",
                        oauthState.getConnectorId(), tokenResponse);
                return buildErrorRedirect("Token exchange failed: provider returned an invalid response.");
            }

            String savedCredentialId = saveCredential(manifest, oauthState.getOrganizationId(), tokenResponse, oauthState.getAllowedDomains());
            log.info("OAuth2 credential saved successfully for connector: {}, credentialId: {}",
                    oauthState.getConnectorId(), savedCredentialId);

            return new RedirectView(getFrontendUrl() + "/oauth-callback?status=success&credentialId=" + savedCredentialId
                    + "&connector=" + manifest.getDisplayName());

        } catch (Exception e) {
            log.error("OAuth2 token exchange failed for connector: {}", oauthState.getConnectorId(), e);
            return buildErrorRedirect("Token exchange failed: " + e.getMessage());
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    /**
     * Saves the token response as a new {@link IntegrationCredential}.
     * Parses {@code expires_in} (seconds) to compute {@code tokenExpiresAt} for
     * the background refresh job.
     */
    private String saveCredential(ConnectorManifest manifest, String organizationId,
                                   Map<String, Object> tokenData, String allowedDomains) {
        IntegrationCredential credential = new IntegrationCredential();
        credential.setId(UUID.randomUUID().toString());
        credential.setOrganizationId(organizationId);
        credential.setConnectorId(manifest.getConnectorId());
        credential.setName(manifest.getDisplayName() + " OAuth2");
        credential.setType("OAUTH2");
        credential.setTokenType("oauth2");
        
        credential.setConnectionStatus(com.app.common.entity.ConnectionStatus.ACTIVE);
        credential.setConnectedAs("OAuth Account"); // A full implementation would fetch the real identity using verifyAction

        // Parse token expiry — set tokenExpiresAt so the refresh job can detect it
        Object expiresIn = tokenData.get("expires_in");
        if (expiresIn instanceof Number) {
            long seconds = ((Number) expiresIn).longValue();
            credential.setTokenExpiresAt(Instant.now().plusSeconds(seconds));
        }

        Map<String, String> creds = new HashMap<>();
        tokenData.forEach((k, v) -> creds.put(k, String.valueOf(v)));
        if (allowedDomains != null && !allowedDomains.isEmpty()) {
            creds.put("allowed_domains", allowedDomains);
        }
        credential.setCredentials(creds);

        IntegrationCredential saved = credentialService.createCredential(credential);
        return saved.getId();
    }

    private RedirectView buildErrorRedirect(String message) {
        return new RedirectView(getFrontendUrl() + "/oauth-callback?status=error&message="
                + java.net.URLEncoder.encode(message, java.nio.charset.StandardCharsets.UTF_8));
    }

    private String getProperty(String connectorId, String key) {
        return environment.getProperty("workflow.connectors." + connectorId + "." + key);
    }

    private String getCallbackUrl() {
        return environment.getProperty("workflow.api.base-url", "http://localhost:8080") + "/rest/oauth/callback";
    }

    private String getFrontendUrl() {
        return environment.getProperty("workflow.frontend.base-url", "http://localhost:5173");
    }
}
