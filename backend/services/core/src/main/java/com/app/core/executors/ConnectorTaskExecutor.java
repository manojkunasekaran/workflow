package com.app.core.executors;

import com.app.common.connector.ConnectorAction;
import com.app.common.connector.ConnectorAuthType;
import com.app.common.connector.ConnectorManifest;
import com.app.persistence.connector.ConnectorRegistry;
import com.app.common.entity.IntegrationCredential;
import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.ConnectorTaskExecutionData;
import com.app.common.model.task.execution.HttpTaskExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.ConnectorTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.service.CredentialProvider;
import com.app.core.service.TaskExecutor;
import com.app.core.service.VariableResolver;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import com.app.core.service.ScriptEvaluationService;

import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class ConnectorTaskExecutor implements TaskExecutor {

    private final ConnectorRegistry connectorRegistry;
    private final CredentialProvider credentialProvider;
    private final VariableResolver variableResolver;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final ScriptEvaluationService scriptEvaluationService;

    @Override
    public boolean canExecute(TaskType taskType) {
        return TaskType.CONNECTOR_TASK == taskType;
    }

    @Override
    public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
        log.info("Starting execution of Connector Task: {}", task.getTaskId());

        if (!(task.getParameters() instanceof ConnectorTaskParameters params)) {
            throw new IllegalArgumentException("Invalid parameters for Connector task");
        }

        ConnectorManifest manifest = connectorRegistry.findById(params.getConnectorId())
                .orElseThrow(() -> new IllegalArgumentException("Unknown connector: " + params.getConnectorId()));
        ConnectorAction action = connectorRegistry.findAction(params.getConnectorId(), params.getActionId());

        String path = action.getPath();
        Map<String, Object> resolvedInputs = new HashMap<>();
        
        // Resolve all user inputs first
        if (params.getInputs() != null) {
            params.getInputs().forEach((key, val) -> 
                resolvedInputs.put(key, variableResolver.resolveValue(val, context))
            );
        }

        // Substitute path parameters (e.g., {channelId}) and remove them from the body
        if (action.getPathParams() != null) {
            for (String param : action.getPathParams()) {
                Object val = resolvedInputs.remove(param);
                if (val != null) {
                    path = path.replace("{" + param + "}", val.toString());
                } else {
                    throw new IllegalArgumentException("Missing required path parameter: " + param);
                }
            }
        }

        String url = manifest.getBaseUrl() + path;
        String method = action.getMethod();

        HttpHeaders headers = new HttpHeaders();
        if (action.getFixedHeaders() != null) {
            action.getFixedHeaders().forEach(headers::add);
        }
        applyAuth(manifest, params.getCredentialId(), headers, context);

        Map<String, Object> body = buildBody(action, resolvedInputs, context);

        HttpTaskExecutionData.HttpRequestDetails requestDetails = HttpTaskExecutionData.HttpRequestDetails.builder()
                .url(url)
                .method(method.toUpperCase())
                .headers(headersToMap(headers))
                .body(body)
                .timestamp(Instant.now())
                .build();

        log.info("Connector Request - URL: {}, Method: {}", url, method);

        int maxRetries = Optional.ofNullable(params.getMaxRetries())
                .orElse(action.getMaxRetries() != null ? action.getMaxRetries() : 3);
        int maxAttempts = maxRetries + 1;
        
        long delayMs = Optional.ofNullable(params.getRetryDelayMs())
                .orElse(action.getRetryDelayMs() != null ? action.getRetryDelayMs().longValue() : 1000L);

        HttpEntity<Object> requestEntity = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = null;
        HttpStatusCodeException lastHttpError = null;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                response = restTemplate.exchange(
                        url,
                        HttpMethod.valueOf(Objects.requireNonNull(method.toUpperCase())),
                        requestEntity,
                        String.class);
                lastHttpError = null;
                break; // success — exit retry loop

            } catch (HttpStatusCodeException e) {
                int statusCode = e.getStatusCode().value();

                // 4xx errors (except 429 Rate Limited) are client errors — do not retry
                if (statusCode >= 400 && statusCode < 500 && statusCode != 429) {
                    lastHttpError = e;
                    break;
                }

                lastHttpError = e;
                if (attempt < maxAttempts) {
                    long waitMs = delayMs;
                    // Respect Retry-After header for rate-limit responses
                    if (statusCode == 429) {
                        List<String> retryAfter = e.getResponseHeaders() != null
                                ? e.getResponseHeaders().get("Retry-After") : null;
                        if (retryAfter != null && !retryAfter.isEmpty()) {
                            try { waitMs = Long.parseLong(retryAfter.get(0)) * 1000L; } catch (NumberFormatException ignored) {}
                        }
                    }
                    log.warn("Connector request failed (attempt {}/{}) with status {}. Retrying in {}ms...",
                            attempt, maxAttempts, statusCode, waitMs);
                    try { Thread.sleep(waitMs); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); break; }
                    delayMs *= 2; // exponential backoff
                }

            } catch (RestClientException e) {
                log.error("Connector request failed with network error: {}", e.getMessage(), e);
                return TaskExecutionResult.builder()
                        .status(TaskExecutionResult.Status.FAILED)
                        .errorMessage("Connector request failed: " + e.getMessage())
                        .build();
            }
        }

        // All retries exhausted or non-retryable 4xx
        if (lastHttpError != null) {
            log.error("Connector request failed after {} attempt(s): {}", maxAttempts, lastHttpError.getStatusCode());
            Object errorBody = parseBody(lastHttpError.getResponseBodyAsString());
            HttpTaskExecutionData.HttpResponseDetails errorResponseDetails = HttpTaskExecutionData.HttpResponseDetails.builder()
                    .statusCode(lastHttpError.getStatusCode().value())
                    .statusText(lastHttpError.getStatusCode().toString())
                    .headers(headersToMap(lastHttpError.getResponseHeaders()))
                    .body(errorBody)
                    .timestamp(Instant.now())
                    .build();
            ConnectorTaskExecutionData errorExecutionData = ConnectorTaskExecutionData.builder()
                    .connectorId(manifest.getConnectorId())
                    .actionId(action.getActionId())
                    .request(requestDetails)
                    .response(errorResponseDetails)
                    .build();
            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.FAILED)
                    .errorMessage("Connector request failed: " + lastHttpError.getStatusCode())
                    .executionData(errorExecutionData)
                    .output(errorExecutionData.toOutputMap())
                    .build();
        }

        Object parsedBody = parseBody(response.getBody());
        HttpTaskExecutionData.HttpResponseDetails responseDetails = HttpTaskExecutionData.HttpResponseDetails.builder()
                .statusCode(response.getStatusCode().value())
                .statusText(response.getStatusCode().toString())
                .headers(headersToMap(response.getHeaders()))
                .body(parsedBody)
                .timestamp(Instant.now())
                .build();

        ConnectorTaskExecutionData executionData = ConnectorTaskExecutionData.builder()
                .connectorId(manifest.getConnectorId())
                .actionId(action.getActionId())
                .request(requestDetails)
                .response(responseDetails)
                .build();

        log.info("Connector Response - Status: {}", response.getStatusCode());

        return TaskExecutionResult.builder()
                .status(TaskExecutionResult.Status.COMPLETED)
                .executionData(executionData)
                .output(executionData.toOutputMap())
                .build();
    }

    private void applyAuth(ConnectorManifest manifest, String credentialId, HttpHeaders headers, ExecutionContext context) {
        if (manifest.getAuthType() == ConnectorAuthType.NONE) {
            return;
        }

        if (credentialId == null || credentialId.isEmpty()) {
            throw new IllegalArgumentException("Credential is required for connector: " + manifest.getConnectorId());
        }

        String resolvedCredentialId = variableResolver.resolveString(credentialId, context);
        Optional<IntegrationCredential> credentialOpt = credentialProvider.getDecryptedCredential(resolvedCredentialId);
        
        if (credentialOpt.isEmpty()) {
            throw new IllegalArgumentException("Credential not found: " + resolvedCredentialId);
        }

        IntegrationCredential credential = credentialOpt.get();

        // Guard: fail fast with a clear error if an OAuth2 token has expired.
        // This surfaces a human-readable error instead of a cryptic 401 from the downstream API.
        // The OAuthTokenRefreshJob should prevent this in normal operation.
        if ("oauth2".equals(credential.getTokenType()) && credential.getTokenExpiresAt() != null) {
            if (java.time.Instant.now().isAfter(credential.getTokenExpiresAt())) {
                throw new IllegalStateException(
                        "OAuth2 token for credential '" + credential.getName() + "' has expired. " +
                        "Please re-authorize in the Credentials page.");
            }
        }

        Map<String, String> creds = credential.getCredentials();
        if (creds == null) {
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
            case BASIC_AUTH -> {
                String username = creds.get("username");
                String password = creds.get("password");
                if (username != null && password != null) {
                    String encoded = Base64.getEncoder().encodeToString(
                            (username + ":" + password).getBytes());
                    headers.add(HttpHeaders.AUTHORIZATION, "Basic " + encoded);
                }
            }
            case CUSTOM_HEADER, OAUTH2 -> {
                if (manifest.getAuthType() == ConnectorAuthType.OAUTH2 && creds.containsKey("access_token")) {
                    headers.add(HttpHeaders.AUTHORIZATION, "Bearer " + creds.get("access_token"));
                } else {
                    creds.forEach(headers::add);
                }
            }
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> buildBody(ConnectorAction action, Map<String, Object> resolvedInputs, ExecutionContext context) {
        // If there's a custom script, evaluate it to build the body
        if (action.getInputScript() != null && !action.getInputScript().isBlank()) {
            try {
                // We provide the workflow context, but inject the resolved Inputs directly as a convenience
                Map<String, Object> workflowData = new HashMap<>(context.getAllVariables());
                workflowData.put("inputs", resolvedInputs);

                ScriptEvaluationService.ScriptResult result = scriptEvaluationService.executeScript(action.getInputScript(), workflowData);
                
                if (result.data() == null) {
                    return null;
                }
                
                if (result.data() instanceof Map) {
                    return (Map<String, Object>) result.data();
                } else {
                    log.warn("Connector action {} inputScript returned non-object: {}. Returning null body.", action.getActionId(), result.data());
                    return null;
                }
            } catch (Exception e) {
                throw new RuntimeException("Failed to execute connector inputScript: " + e.getMessage(), e);
            }
        }

        if ("GET".equalsIgnoreCase(action.getMethod())) {
            return null; 
        }

        Map<String, Object> body = new LinkedHashMap<>();
        if (action.getFixedBody() != null) {
            body.putAll(action.getFixedBody());
        }
        
        if (resolvedInputs != null && !resolvedInputs.isEmpty()) {
            body.putAll(resolvedInputs);
        }
        
        return body.isEmpty() ? null : body;
    }

    private Object parseBody(String body) {
        if (body != null && !body.isEmpty()) {
            try {
                if (body.trim().startsWith("{") || body.trim().startsWith("[")) {
                    return objectMapper.readValue(body, new TypeReference<Object>() {});
                }
            } catch (JsonProcessingException e) {
                // Not valid JSON, return as string
            }
        }
        return body;
    }

    private Map<String, String> headersToMap(HttpHeaders headers) {
        Map<String, String> headerMap = new HashMap<>();
        if (headers != null) {
            headers.forEach((key, values) -> {
                if (values != null && !values.isEmpty()) {
                    headerMap.put(key, String.join(", ", values));
                }
            });
        }
        return headerMap;
    }
}
