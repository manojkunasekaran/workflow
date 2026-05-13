package com.app.core.executors;

import com.app.common.entity.IntegrationCredential;
import com.app.common.model.task.execution.HttpTaskExecutionData;
import com.app.common.model.task.parameters.HttpTaskParameters;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.core.model.ExecutionContext;
import com.app.core.service.CredentialService;
import com.app.core.service.TaskExecutor;
import com.app.core.service.VariableResolver;
import com.app.common.entity.WorkflowExecution;

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

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class HttpTaskExecutor implements TaskExecutor {

    private final RestTemplate restTemplate;
    private final CredentialService credentialService;
    private final VariableResolver variableResolver;
    private final ObjectMapper objectMapper;

    @Override
    public boolean canExecute(TaskType taskType) {
        return TaskType.HTTP_TASK == taskType;
    }

    @Override
    public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
        log.info("Starting execution of HTTP Task: {}", task.getTaskId());

        if (!(task.getParameters() instanceof HttpTaskParameters params)) {
            throw new IllegalArgumentException("Invalid parameters for HTTP task");
        }

        // Resolve variables in URL
        String url = variableResolver.resolveString(params.getUrl(), context);
        String method = params.getMethod();

        if (url == null || url.isEmpty()) {
            throw new IllegalArgumentException("URL is required for HTTP task");
        }
        if (method == null || method.isEmpty()) {
            throw new IllegalArgumentException("Method is required for HTTP task");
        }

        // Build headers with variable resolution
        HttpHeaders headers = new HttpHeaders();
        if (params.getHeaders() != null) {
            params.getHeaders().forEach((key, value) -> {
                String resolvedKey = variableResolver.resolveString(key, context);
                String resolvedValue = variableResolver.resolveString(value, context);
                headers.add(resolvedKey, resolvedValue);
            });
        }

        // Apply credentials if provided
        String credentialId = params.getCredentialId();
        if (credentialId != null && !credentialId.isEmpty()) {
            String resolvedCredentialId = variableResolver.resolveString(credentialId, context);
            Optional<IntegrationCredential> credentialOpt = credentialService.getCredential(resolvedCredentialId);
            if (credentialOpt.isPresent()) {
                IntegrationCredential credential = credentialOpt.get();
                if (credential.getCredentials() != null) {
                    credential.getCredentials().forEach(headers::add);
                }
                log.info("Applied credentials for ID: {}", resolvedCredentialId);
            } else {
                log.warn("Credential ID {} provided but not found", resolvedCredentialId);
            }
        }

        // Resolve body (could be a string with expressions or a Map)
        Object resolvedBody = resolveBody(params.getBody(), context);

        // Build request details for audit
        HttpTaskExecutionData.HttpRequestDetails requestDetails = HttpTaskExecutionData.HttpRequestDetails.builder()
                .url(url)
                .method(method.toUpperCase())
                .headers(headersToMap(headers))
                .body(resolvedBody)
                .timestamp(Instant.now())
                .build();

        log.info("HTTP Request - URL: {}, Method: {}", url, method);

        HttpEntity<Object> requestEntity = new HttpEntity<>(resolvedBody, headers);

        ResponseEntity<String> response;
        try {
            response = restTemplate.exchange(
                    url,
                    HttpMethod.valueOf(Objects.requireNonNull(method.toUpperCase())),
                    requestEntity,
                    String.class);
        } catch (HttpStatusCodeException e) {
            log.error("HTTP request failed with status: {}", e.getStatusCode(), e);

            Object errorBody = parseBody(e.getResponseBodyAsString());

            HttpTaskExecutionData.HttpResponseDetails responseDetails = HttpTaskExecutionData.HttpResponseDetails
                    .builder()
                    .statusCode(e.getStatusCode().value())
                    .statusText(e.getStatusCode().toString())
                    .headers(headersToMap(e.getResponseHeaders()))
                    .body(errorBody)
                    .timestamp(Instant.now())
                    .build();

            HttpTaskExecutionData executionData = HttpTaskExecutionData.builder()
                    .request(requestDetails)
                    .response(responseDetails)
                    .build();

            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.FAILED)
                    .errorMessage("HTTP request failed: " + e.getStatusCode())
                    .executionData(executionData)
                    .output(buildOutput(executionData))
                    .build();
        } catch (RestClientException e) {
            log.error("HTTP request failed: {}", e.getMessage(), e);
            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.FAILED)
                    .errorMessage("HTTP request failed: " + e.getMessage())
                    .build();
        }

        // Parse body once for both execution data and output
        Object parsedBody = parseBody(response.getBody());

        // Build response details for audit
        HttpTaskExecutionData.HttpResponseDetails responseDetails = HttpTaskExecutionData.HttpResponseDetails.builder()
                .statusCode(response.getStatusCode().value())
                .statusText(response.getStatusCode().toString())
                .headers(headersToMap(response.getHeaders()))
                .body(parsedBody)
                .timestamp(Instant.now())
                .build();

        HttpTaskExecutionData executionData = HttpTaskExecutionData.builder()
                .request(requestDetails)
                .response(responseDetails)
                .build();

        log.info("HTTP Response - Status: {}", response.getStatusCode());

        return TaskExecutionResult.builder()
                .status(TaskExecutionResult.Status.COMPLETED)
                .executionData(executionData)
                .output(buildOutput(executionData))
                .build();
    }

    /**
     * Resolve body - handles both string templates and Map objects.
     */
    @SuppressWarnings("unchecked")
    private Object resolveBody(Object body, ExecutionContext context) {
        if (body == null) {
            return null;
        }
        if (body instanceof String) {
            return variableResolver.resolveString((String) body, context);
        }
        if (body instanceof Map) {
            return variableResolver.resolveMap((Map<String, Object>) body, context);
        }
        return body;
    }

    /**
     * Parse response body as JSON if possible, otherwise return raw string.
     */
    private Object parseBody(String body) {
        if (body != null && !body.isEmpty()) {
            try {
                // Try to parse as JSON object or array
                if (body.trim().startsWith("{") || body.trim().startsWith("[")) {
                    return objectMapper.readValue(body, new TypeReference<Object>() {
                    });
                }
            } catch (JsonProcessingException e) {
                // Not valid JSON, return as string
            }
        }
        return body;
    }

    private Map<String, String> headersToMap(HttpHeaders headers) {
        Map<String, String> headerMap = new HashMap<>();
        headers.forEach((key, values) -> {
            if (values != null && !values.isEmpty()) {
                headerMap.put(key, String.join(", ", values));
            }
        });
        return headerMap;
    }
}
