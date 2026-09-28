package com.app.api.service.webhook;

import com.app.api.exception.WebhookInboundException;
import com.app.common.entity.TriggerRegistration;
import com.app.common.model.trigger.WebhookInboundConfig;
import com.app.common.model.trigger.WebhookVerificationMode;
import com.app.crypto.util.EncryptionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

/**
 * Verifies inbound webhook authenticity using configured strategies.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebhookEventVerifier {

    private final EncryptionService encryptionService;

    public void verifyPost(
            HttpServletRequest request,
            byte[] rawBody,
            TriggerRegistration registration,
            WebhookInboundConfig inbound) {
        WebhookVerificationMode mode = resolveMode(inbound);
        if (mode == WebhookVerificationMode.NONE) {
            log.warn(
                    "Webhook workflow {} accepts unverified POST events (verificationMode=NONE)",
                    registration.getWorkflowDefinitionId());
            return;
        }
        if (mode == WebhookVerificationMode.CHALLENGE) {
            throw new WebhookInboundException(HttpStatus.UNAUTHORIZED, "Webhook verification failed");
        }

        String secret = resolveSecret(registration, inbound);
        if (secret == null || secret.isBlank()) {
            throw new WebhookInboundException(HttpStatus.UNAUTHORIZED, "Webhook verification failed");
        }

        String headerName = inbound.getHeaderName();
        if (headerName == null || headerName.isBlank()) {
            throw new WebhookInboundException(HttpStatus.UNAUTHORIZED, "Webhook verification failed");
        }

        String headerValue = request.getHeader(headerName);
        if (headerValue == null || headerValue.isBlank()) {
            throw new WebhookInboundException(HttpStatus.UNAUTHORIZED, "Webhook verification failed");
        }

        if (mode == WebhookVerificationMode.HEADER_SECRET) {
            if (!constantTimeEquals(headerValue, secret)) {
                throw new WebhookInboundException(HttpStatus.UNAUTHORIZED, "Webhook verification failed");
            }
            return;
        }

        if (mode == WebhookVerificationMode.HMAC_SHA256) {
            byte[] body = rawBody != null ? rawBody : new byte[0];
            String expected = computeHmacSha256Hex(body, secret);
            if (!matchesHmacHeader(headerValue, expected)) {
                throw new WebhookInboundException(HttpStatus.FORBIDDEN, "Webhook verification failed");
            }
        }
    }

    public ResponseEntity<String> handleChallengeGet(HttpServletRequest request, WebhookInboundConfig inbound) {
        WebhookVerificationMode mode = resolveMode(inbound);
        if (mode != WebhookVerificationMode.CHALLENGE) {
            throw new WebhookInboundException(HttpStatus.METHOD_NOT_ALLOWED, "GET is not supported for this webhook");
        }

        String queryParam = inbound.getChallengeQueryParam();
        if (queryParam == null || queryParam.isBlank()) {
            throw new WebhookInboundException(HttpStatus.BAD_REQUEST, "Challenge query parameter is not configured");
        }

        String challengeValue = request.getParameter(queryParam);
        if (challengeValue == null || challengeValue.isBlank()) {
            throw new WebhookInboundException(HttpStatus.BAD_REQUEST, "Challenge query parameter is missing");
        }

        String responseField = inbound.getChallengeResponseField();
        if (responseField == null || responseField.isBlank()) {
            return ResponseEntity.ok(challengeValue);
        }

        String json = "{\""
                + escapeJson(responseField)
                + "\":\""
                + escapeJson(challengeValue)
                + "\"}";
        return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(json);
    }

    private WebhookVerificationMode resolveMode(WebhookInboundConfig inbound) {
        if (inbound == null || inbound.getVerificationMode() == null) {
            return WebhookVerificationMode.NONE;
        }
        return inbound.getVerificationMode();
    }

    private String resolveSecret(TriggerRegistration registration, WebhookInboundConfig inbound) {
        if (inbound != null && inbound.getSecret() != null && !inbound.getSecret().isBlank()) {
            return inbound.getSecret();
        }
        if (registration.getSigningSecret() == null || registration.getSigningSecret().isBlank()) {
            return null;
        }
        return encryptionService.decrypt(registration.getSigningSecret());
    }

    private boolean matchesHmacHeader(String headerValue, String expectedHex) {
        String normalizedHeader = headerValue.trim();
        if (normalizedHeader.toLowerCase(Locale.ROOT).startsWith("sha256=")) {
            normalizedHeader = normalizedHeader.substring("sha256=".length());
        }
        return constantTimeEquals(normalizedHeader.toLowerCase(Locale.ROOT), expectedHex.toLowerCase(Locale.ROOT));
    }

    private String computeHmacSha256Hex(byte[] body, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(body);
            StringBuilder hex = new StringBuilder(2 * hash.length);
            for (byte value : hash) {
                String part = Integer.toHexString(0xff & value);
                if (part.length() == 1) {
                    hex.append('0');
                }
                hex.append(part);
            }
            return hex.toString();
        } catch (Exception e) {
            throw new WebhookInboundException(HttpStatus.UNAUTHORIZED, "Webhook verification failed");
        }
    }

    private boolean constantTimeEquals(String left, String right) {
        if (left == null || right == null) {
            return false;
        }
        return MessageDigest.isEqual(
                left.getBytes(StandardCharsets.UTF_8),
                right.getBytes(StandardCharsets.UTF_8));
    }

    private String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
