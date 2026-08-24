package com.app.api.service;

import com.app.api.dto.ConnectorTestRequest;
import com.app.api.dto.ConnectorTestResult;
import com.app.common.connector.ConnectorAction;
import com.app.common.connector.ConnectorAuthType;
import com.app.common.connector.ConnectorManifest;
import com.app.common.entity.IntegrationCredential;
import com.app.common.exception.ResourceNotFoundException;
import com.app.core.service.CredentialProvider;
import com.app.persistence.connector.ConnectorRegistry;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Executes a one-shot test call for a connector action using real credentials.
 *
 * <p>This service is intentionally <b>separate</b> from {@code ConnectorTaskExecutor}
 * because test calls have different semantics:
 * <ul>
 *   <li>No {@code ExecutionContext} — inputs are provided directly.</li>
 *   <li>No retry logic — test calls should fail immediately and show the raw error.</li>
 *   <li>Returns a rich {@link ConnectorTestResult} with duration metrics.</li>
 * </ul>
 *
 * <p><b>Warning:</b> This makes a real HTTP call to the downstream API using real
 * credentials. Actions that mutate state (e.g. "Post Message") will execute for real.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConnectorTestService {

    // In a future multi-tenant sprint, replace with SecurityContextHolder lookup.
    private static final String DEFAULT_ORG_ID = "default-org";

    private final ConnectorRegistry connectorRegistry;
    private final CredentialProvider credentialProvider;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final com.app.core.service.ScriptEvaluationService scriptEvaluationService;

    public ConnectorTestResult testAction(String connectorId, ConnectorTestRequest request) {
        ConnectorManifest manifest = connectorRegistry.findById(connectorId, DEFAULT_ORG_ID)
                .orElseThrow(() -> new ResourceNotFoundException("ConnectorManifest", connectorId));

        ConnectorAction action = manifest.getActions().stream()
                .filter(a -> a.getActionId().equals(request.getActionId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("ConnectorAction", request.getActionId()));

        String path = action.getPath();
        Map<String, Object> inputs = request.getInputs() != null ? request.getInputs() : new HashMap<>();

        // Substitute path parameters
        if (action.getPathParams() != null) {
            for (String param : action.getPathParams()) {
                Object val = inputs.remove(param);
                if (val != null) {
                    path = path.replace("{" + param + "}", val.toString());
                }
            }
        }

        String url = manifest.getBaseUrl() + path;
        HttpHeaders headers = new HttpHeaders();

        if (action.getFixedHeaders() != null) {
            action.getFixedHeaders().forEach(headers::add);
        }
        applyAuth(manifest, request.getCredentialId(), headers);

        Map<String, Object> body = buildBody(action, inputs);
        HttpEntity<Object> requestEntity = new HttpEntity<>(body, headers);

        log.info("Connector test call: connectorId={}, actionId={}, url={}", connectorId, request.getActionId(), url);

        long start = System.currentTimeMillis();
        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.valueOf(Objects.requireNonNull(action.getMethod().toUpperCase())),
                    requestEntity,
                    String.class);

            long durationMs = System.currentTimeMillis() - start;
            Object parsed = parseBody(response.getBody());

            return ConnectorTestResult.builder()
                    .success(response.getStatusCode().is2xxSuccessful())
                    .statusCode(response.getStatusCode().value())
                    .durationMs(durationMs)
                    .response(parsed)
                    .build();

        } catch (HttpStatusCodeException e) {
            long durationMs = System.currentTimeMillis() - start;
            Object errorBody = parseBody(e.getResponseBodyAsString());
            return ConnectorTestResult.builder()
                    .success(false)
                    .statusCode(e.getStatusCode().value())
                    .durationMs(durationMs)
                    .response(errorBody)
                    .error("HTTP " + e.getStatusCode().value() + ": " + e.getStatusCode())
                    .build();

        } catch (Exception e) {
            long durationMs = System.currentTimeMillis() - start;
            return ConnectorTestResult.builder()
                    .success(false)
                    .statusCode(0)
                    .durationMs(durationMs)
                    .error("Network error: " + e.getMessage())
                    .build();
        }
    }

    // ─── Auth ──────────────────────────────────────────────────────────────────

    private void applyAuth(ConnectorManifest manifest, String credentialId, HttpHeaders headers) {
        if (manifest.getAuthType() == ConnectorAuthType.NONE) return;
        if (credentialId == null || credentialId.isBlank()) {
            throw new IllegalArgumentException("A credential is required to test this connector.");
        }

        IntegrationCredential credential = credentialProvider.getDecryptedCredential(credentialId)
                .orElseThrow(() -> new IllegalArgumentException("Credential not found: " + credentialId));

        Map<String, String> creds = credential.getCredentials();
        if (creds == null) return;

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
            case BASIC_AUTH -> {
                String username = creds.get("username");
                String password = creds.get("password");
                if (username != null && password != null) {
                    String encoded = Base64.getEncoder().encodeToString((username + ":" + password).getBytes());
                    headers.add(HttpHeaders.AUTHORIZATION, "Basic " + encoded);
                }
            }
            case OAUTH2, CUSTOM_HEADER -> {
                if (manifest.getAuthType() == ConnectorAuthType.OAUTH2 && creds.containsKey("access_token")) {
                    headers.add(HttpHeaders.AUTHORIZATION, "Bearer " + creds.get("access_token"));
                } else {
                    creds.forEach(headers::add);
                }
            }
        }
    }

    // ─── Body ──────────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private Map<String, Object> buildBody(ConnectorAction action, Map<String, Object> inputs) {
        if ("GET".equalsIgnoreCase(action.getMethod())) return null;
        
        // Evaluate input script if present
        if (action.getInputScript() != null && !action.getInputScript().isBlank()) {
            try {
                Map<String, Object> context = new HashMap<>();
                context.put("inputs", inputs);
                com.app.core.service.ScriptEvaluationService.ScriptResult result = 
                    scriptEvaluationService.executeScript(action.getInputScript(), context);
                
                if (result.data() == null) {
                    return null;
                }
                
                if (result.data() instanceof Map) {
                    return (Map<String, Object>) result.data();
                } else if (result.data() instanceof String) {
                    // Script returned a string body, try to parse it
                    try {
                        return objectMapper.readValue((String) result.data(), new TypeReference<Map<String, Object>>() {});
                    } catch (Exception e) {
                        Map<String, Object> map = new HashMap<>();
                        map.put("body", result.data());
                        return map;
                    }
                }
                
                Map<String, Object> map = new HashMap<>();
                map.put("data", result.data());
                return map;
                
            } catch (Exception e) {
                log.error("Failed to evaluate connector input script for test call", e);
                throw new IllegalArgumentException("Failed to evaluate input script: " + e.getMessage(), e);
            }
        }
        
        // Default behavior if no script
        Map<String, Object> body = new LinkedHashMap<>();
        if (action.getFixedBody() != null) body.putAll(action.getFixedBody());
        if (inputs != null) body.putAll(inputs);
        return body.isEmpty() ? null : body;
    }

    private Object parseBody(String body) {
        if (body == null || body.isBlank()) return null;
        try {
            if (body.trim().startsWith("{") || body.trim().startsWith("[")) {
                return objectMapper.readValue(body, new TypeReference<Object>() {});
            }
        } catch (Exception ignored) {}
        return body;
    }
}
