package com.app.api.service.poll;

import com.app.api.service.auth.CredentialAuthResolver;
import com.app.common.model.trigger.PollHttpConfig;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Objects;

/**
 * Executes HTTP requests for poll triggers using API RestTemplate and credential auth.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PollHttpExecutor {

    private final CredentialAuthResolver credentialAuthResolver;
    private final ObjectMapper objectMapper;

    public PollHttpResult execute(PollHttpConfig httpConfig) {
        return execute(httpConfig, null);
    }

    public PollHttpResult execute(PollHttpConfig httpConfig, String lastEtag) {
        if (httpConfig == null || httpConfig.getUrl() == null || httpConfig.getUrl().isBlank()) {
            return PollHttpResult.builder()
                    .success(false)
                    .error("Poll HTTP URL is required")
                    .build();
        }

        HttpHeaders headers = new HttpHeaders();
        if (httpConfig.getHeaders() != null) {
            httpConfig.getHeaders().forEach(headers::add);
        }
        if (lastEtag != null && !lastEtag.isBlank()) {
            headers.setIfNoneMatch(lastEtag);
        }
        credentialAuthResolver.applyAuth(httpConfig.getCredentialId(), headers);

        Object body = buildBody(httpConfig);
        HttpEntity<Object> requestEntity = new HttpEntity<>(body, headers);
        RestTemplate restTemplate = restTemplateFor(httpConfig);
        HttpMethod method = HttpMethod.valueOf(
                Objects.requireNonNullElse(httpConfig.getMethod(), "GET").toUpperCase());

        long start = System.currentTimeMillis();
        try {
            ResponseEntity<String> response = PollHttpRetryPolicy.executeWithRetry(() ->
                    restTemplate.exchange(httpConfig.getUrl(), method, requestEntity, String.class));
            long durationMs = System.currentTimeMillis() - start;

            if (response.getStatusCode() == HttpStatus.NOT_MODIFIED) {
                return PollHttpResult.builder()
                        .success(true)
                        .statusCode(HttpStatus.NOT_MODIFIED.value())
                        .durationMs(durationMs)
                        .notModified(true)
                        .etag(extractEtag(response.getHeaders()))
                        .build();
            }

            String rawBody = response.getBody();
            Object parsed = parseBody(rawBody);

            return PollHttpResult.builder()
                    .success(response.getStatusCode().is2xxSuccessful())
                    .statusCode(response.getStatusCode().value())
                    .durationMs(durationMs)
                    .body(parsed)
                    .rawBody(rawBody)
                    .etag(extractEtag(response.getHeaders()))
                    .build();
        } catch (HttpStatusCodeException e) {
            long durationMs = System.currentTimeMillis() - start;
            return PollHttpResult.builder()
                    .success(false)
                    .statusCode(e.getStatusCode().value())
                    .durationMs(durationMs)
                    .body(parseBody(e.getResponseBodyAsString()))
                    .rawBody(e.getResponseBodyAsString())
                    .error("HTTP " + e.getStatusCode().value())
                    .build();
        } catch (Exception e) {
            long durationMs = System.currentTimeMillis() - start;
            return PollHttpResult.builder()
                    .success(false)
                    .durationMs(durationMs)
                    .error("Network error: " + e.getMessage())
                    .build();
        }
    }

    private String extractEtag(HttpHeaders headers) {
        if (headers == null) {
            return null;
        }
        String etag = headers.getETag();
        return etag != null ? etag : null;
    }

    private RestTemplate restTemplateFor(PollHttpConfig httpConfig) {
        int timeoutMs = httpConfig.getTimeoutMs() != null ? httpConfig.getTimeoutMs() : 30000;
        Duration timeout = Duration.ofMillis(timeoutMs);
        return new RestTemplateBuilder()
                .requestFactory(() -> {
                    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
                    factory.setConnectTimeout(timeout);
                    factory.setReadTimeout(timeout);
                    return factory;
                })
                .build();
    }

    private Object buildBody(PollHttpConfig httpConfig) {
        if ("GET".equalsIgnoreCase(httpConfig.getMethod())) {
            return null;
        }
        if (httpConfig.getBody() == null || httpConfig.getBody().isBlank()) {
            return null;
        }
        return parseBody(httpConfig.getBody());
    }

    private Object parseBody(String body) {
        if (body == null || body.isBlank()) {
            return null;
        }
        try {
            if (body.trim().startsWith("{") || body.trim().startsWith("[")) {
                return objectMapper.readValue(body, new TypeReference<Object>() {});
            }
        } catch (Exception ignored) {
            // fall through to raw string
        }
        return body;
    }
}
