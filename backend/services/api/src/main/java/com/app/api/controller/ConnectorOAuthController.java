package com.app.api.controller;

import com.app.api.context.OrganizationContext;
import com.app.api.service.organization.OrganizationAccess;
import com.app.api.dto.OAuthAuthorizeRequest;
import com.app.api.dto.OAuthAuthorizeResponse;
import com.app.api.oauth.OAuthClientCredentials;
import com.app.api.oauth.OAuthHttpForm;
import com.app.api.service.ConnectorOAuthPlatformService;
import com.app.api.service.IntegrationCredentialService;
import com.app.common.connector.ConnectorManifest;
import com.app.common.entity.IntegrationCredential;
import com.app.common.entity.OAuthState;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.exception.ValidationException;
import com.app.crypto.util.EncryptionService;
import com.app.persistence.connector.ConnectorRegistry;
import com.app.persistence.repository.OAuthStateRepository;
import com.app.persistence.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.view.RedirectView;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/oauth")
@RequiredArgsConstructor
public class ConnectorOAuthController {

    private final ConnectorRegistry connectorRegistry;
    private final OrganizationRepository organizationRepository;
    private final Environment environment;
    private final ConnectorOAuthPlatformService platformOAuthService;
    private final IntegrationCredentialService credentialService;
    private final OAuthStateRepository stateRepository;
    private final RestTemplate restTemplate;
    private final EncryptionService encryptionService;
    private final OrganizationAccess organizationAccess;

    @GetMapping("/{connectorId}/authorize")
    public RedirectView authorizeGet(
            @PathVariable String connectorId,
            @RequestParam(required = false) String organizationId,
            @RequestParam(required = false) String clientId,
            @RequestParam(required = false) String clientSecret,
            @RequestParam(required = false) String scopes,
            @RequestParam(required = false) String allowedDomains) {
        String authUrl = beginAuthorization(
                connectorId,
                organizationId,
                clientId,
                clientSecret,
                scopes,
                allowedDomains);
        return new RedirectView(authUrl);
    }

    @PostMapping("/{connectorId}/authorize")
    public OAuthAuthorizeResponse authorizePost(
            @PathVariable String connectorId,
            @RequestBody OAuthAuthorizeRequest request) {
        String authUrl = beginAuthorization(
                connectorId,
                resolveOrganizationId(request.getOrganizationId()),
                request.getClientId(),
                request.getClientSecret(),
                request.getScopes(),
                request.getAllowedDomains());
        return new OAuthAuthorizeResponse(authUrl);
    }

    @GetMapping("/callback")
    public RedirectView callback(@RequestParam String code, @RequestParam String state) {
        OAuthState oauthState = stateRepository.findById(state).orElse(null);

        if (oauthState == null || oauthState.getExpiresAt().isBefore(Instant.now())) {
            log.warn("OAuth2 callback received with invalid or expired state: {}", state);
            stateRepository.deleteById(state);
            return buildErrorRedirect("State token is invalid or expired. Please try connecting again.");
        }

        stateRepository.deleteById(state);

        String orgId = oauthState.getOrganizationId();
        ConnectorManifest manifest = connectorRegistry
                .findById(oauthState.getConnectorId(), orgId)
                .or(() -> connectorRegistry.findById(oauthState.getConnectorId()))
                .orElseThrow(() -> new ResourceNotFoundException("ConnectorManifest", oauthState.getConnectorId()));

        OAuthClientCredentials.Resolved managed = resolveManagedOrCustomClient(oauthState);
        String clientId = managed.clientId();
        String clientSecret = managed.clientSecret();
        if (clientId == null || clientId.isBlank()) {
            return buildErrorRedirect(
                    "Managed OAuth is not configured for this app. Ask a platform admin to set Client ID and Secret under Apps, or use Custom OAuth2.");
        }

        Map<String, String> tokenRequestBody = new HashMap<>();
        tokenRequestBody.put("client_id", clientId);
        if (clientSecret != null && !clientSecret.isBlank()) {
            tokenRequestBody.put("client_secret", clientSecret);
        }
        tokenRequestBody.put("code", code);
        tokenRequestBody.put("grant_type", "authorization_code");
        tokenRequestBody.put("redirect_uri", getCallbackUrl());

        try {
            @SuppressWarnings("unchecked")
            ResponseEntity<Map> response = restTemplate.exchange(
                    manifest.getOauth2Config().getTokenUrl(),
                    HttpMethod.POST,
                    OAuthHttpForm.postEntity(tokenRequestBody),
                    Map.class);

            @SuppressWarnings("unchecked")
            Map<String, Object> tokenResponse = response.getBody();

            if (tokenResponse == null || !tokenResponse.containsKey("access_token")) {
                log.error(
                        "OAuth2 token exchange failed for connector {}: invalid response body: {}",
                        oauthState.getConnectorId(),
                        tokenResponse);
                return buildErrorRedirect("Token exchange failed: provider returned an invalid response.");
            }

            String savedCredentialId = saveCredential(manifest, oauthState, tokenResponse);

            try {
                OrganizationContext.setOrganizationId(orgId);
                credentialService.verifyConnection(savedCredentialId);
            } catch (Exception verifyEx) {
                log.warn("OAuth credential saved but verify failed for {}: {}", savedCredentialId, verifyEx.getMessage());
            } finally {
                OrganizationContext.clear();
            }

            log.info(
                    "OAuth2 credential saved successfully for connector: {}, credentialId: {}",
                    oauthState.getConnectorId(),
                    savedCredentialId);

            String connectorLabel = URLEncoder.encode(manifest.getDisplayName(), StandardCharsets.UTF_8);
            return new RedirectView(getFrontendUrl() + "/oauth-callback?status=success&credentialId=" + savedCredentialId
                    + "&connector=" + connectorLabel);

        } catch (Exception e) {
            log.error("OAuth2 token exchange failed for connector: {}", oauthState.getConnectorId(), e);
            return buildErrorRedirect("Token exchange failed: " + e.getMessage());
        }
    }

    private String resolveOrganizationId(String organizationId) {
        if (organizationId != null && !organizationId.isBlank()) {
            return organizationId.trim();
        }
        return organizationAccess.requireOrganizationId();
    }

    private String beginAuthorization(
            String connectorId,
            String organizationId,
            String clientId,
            String clientSecret,
            String scopes,
            String allowedDomains) {
        String orgId = resolveOrganizationId(organizationId);
        if (!organizationRepository.existsById(orgId)) {
            throw new ValidationException("Organization not found.");
        }

        ConnectorManifest manifest = connectorRegistry
                .findById(connectorId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("ConnectorManifest", connectorId));

        if (manifest.getOauth2Config() == null) {
            throw new IllegalArgumentException("Connector '" + connectorId + "' does not support OAuth2");
        }

        String finalClientId = clientId != null && !clientId.isEmpty()
                ? clientId
                : platformOAuthService
                        .resolveManagedClient(connectorId)
                        .map(OAuthClientCredentials.Resolved::clientId)
                        .orElse(null);
        if (finalClientId == null) {
            throw new IllegalStateException(
                    "Managed OAuth is not configured for connector: " + connectorId
                            + ". Platform admin must set OAuth credentials under Apps → " + connectorId
                            + ", or use Custom OAuth2.");
        }

        OAuthState state = new OAuthState();
        state.setId(UUID.randomUUID().toString());
        state.setConnectorId(connectorId);
        state.setOrganizationId(orgId);
        state.setExpiresAt(Instant.now().plusSeconds(600));
        if (clientId != null && !clientId.isEmpty()) {
            state.setCustomClientId(clientId);
            if (clientSecret != null && !clientSecret.isBlank()) {
                state.setCustomClientSecret(encryptionService.encrypt(clientSecret));
            }
            state.setCustomScopes(scopes);
            state.setAllowedDomains(allowedDomains);
        }
        stateRepository.save(state);

        String scopeValue = scopes != null && !scopes.isEmpty()
                ? scopes
                : String.join(
                        " ",
                        manifest.getOauth2Config().getDefaultScopes() != null
                                ? manifest.getOauth2Config().getDefaultScopes()
                                : java.util.Collections.emptyList());

        String authUrl = UriComponentsBuilder
                .fromUriString(manifest.getOauth2Config().getAuthorizationUrl())
                .queryParam("client_id", finalClientId)
                .queryParam("redirect_uri", getCallbackUrl())
                .queryParam("response_type", "code")
                .queryParam("state", state.getId())
                .queryParam("scope", scopeValue)
                .build(false)
                .toUriString();

        log.info("Initiating OAuth2 flow for connector: {}, state: {}", connectorId, state.getId());
        return authUrl;
    }

    private String saveCredential(
            ConnectorManifest manifest, OAuthState oauthState, Map<String, Object> tokenData) {
        IntegrationCredential credential = new IntegrationCredential();
        credential.setId(UUID.randomUUID().toString());
        credential.setOrganizationId(oauthState.getOrganizationId());
        credential.setConnectorId(manifest.getConnectorId());
        credential.setName(manifest.getDisplayName() + " OAuth2");
        credential.setType("OAUTH2");
        credential.setTokenType("oauth2");

        credential.setConnectionStatus(com.app.common.entity.ConnectionStatus.ACTIVE);
        credential.setConnectedAs("OAuth Account");

        Object expiresIn = tokenData.get("expires_in");
        if (expiresIn instanceof Number) {
            long seconds = ((Number) expiresIn).longValue();
            credential.setTokenExpiresAt(Instant.now().plusSeconds(seconds));
        }

        Map<String, String> creds = new HashMap<>();
        tokenData.forEach((k, v) -> creds.put(k, String.valueOf(v)));
        if (oauthState.getAllowedDomains() != null && !oauthState.getAllowedDomains().isEmpty()) {
            creds.put("allowed_domains", oauthState.getAllowedDomains());
        }
        if (oauthState.getCustomClientId() != null && !oauthState.getCustomClientId().isBlank()) {
            creds.put(OAuthClientCredentials.CLIENT_ID_KEY, oauthState.getCustomClientId());
            String secret = resolveStateClientSecret(oauthState);
            if (secret != null && !secret.isBlank()) {
                creds.put(OAuthClientCredentials.CLIENT_SECRET_KEY, secret);
            }
        }

        credential.setCredentials(creds);
        IntegrationCredential saved = credentialService.createCredential(credential);
        return saved.getId();
    }

    private OAuthClientCredentials.Resolved resolveManagedOrCustomClient(OAuthState oauthState) {
        if (oauthState.getCustomClientId() != null && !oauthState.getCustomClientId().isBlank()) {
            String secret = oauthState.getCustomClientSecret() != null && !oauthState.getCustomClientSecret().isBlank()
                    ? encryptionService.decrypt(oauthState.getCustomClientSecret())
                    : null;
            return new OAuthClientCredentials.Resolved(oauthState.getCustomClientId(), secret);
        }
        return platformOAuthService
                .resolveManagedClient(oauthState.getConnectorId())
                .orElse(new OAuthClientCredentials.Resolved(null, null));
    }

    private RedirectView buildErrorRedirect(String message) {
        return new RedirectView(getFrontendUrl() + "/oauth-callback?status=error&message="
                + URLEncoder.encode(message, StandardCharsets.UTF_8));
    }

    private String getCallbackUrl() {
        return environment.getProperty("workflow.api.base-url", "http://localhost:8080") + "/rest/oauth/callback";
    }

    private String getFrontendUrl() {
        return environment.getProperty("workflow.frontend.base-url", "http://localhost:5173");
    }
}
