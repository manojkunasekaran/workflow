package com.app.api.service.webhook;

import com.app.api.exception.WebhookInboundException;
import com.app.common.constant.TriggerRegistrationStatus;
import com.app.common.entity.TriggerRegistration;
import com.app.common.model.trigger.WebhookInboundConfig;
import com.app.common.model.trigger.WebhookVerificationMode;
import com.app.crypto.util.EncryptionService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebhookEventVerifierTest {

    @Mock
    private EncryptionService encryptionService;

    @Mock
    private HttpServletRequest request;

    private WebhookEventVerifier verifier;

    @BeforeEach
    void setUp() {
        verifier = new WebhookEventVerifier(encryptionService);
    }

    @Test
    void verifyPost_headerSecret_acceptsMatchingHeader() {
        TriggerRegistration registration = registrationWithEncryptedSecret("platform-secret");
        WebhookInboundConfig inbound = WebhookInboundConfig.builder()
                .verificationMode(WebhookVerificationMode.HEADER_SECRET)
                .headerName("X-Webhook-Secret")
                .build();

        when(encryptionService.decrypt("enc_secret")).thenReturn("platform-secret");
        when(request.getHeader("X-Webhook-Secret")).thenReturn("platform-secret");

        verifier.verifyPost(request, "{}".getBytes(StandardCharsets.UTF_8), registration, inbound);
    }

    @Test
    void verifyPost_headerSecret_rejectsMismatch() {
        TriggerRegistration registration = registrationWithEncryptedSecret("platform-secret");
        WebhookInboundConfig inbound = WebhookInboundConfig.builder()
                .verificationMode(WebhookVerificationMode.HEADER_SECRET)
                .headerName("X-Webhook-Secret")
                .build();

        when(encryptionService.decrypt("enc_secret")).thenReturn("platform-secret");
        when(request.getHeader("X-Webhook-Secret")).thenReturn("wrong-secret");

        WebhookInboundException ex = assertThrows(WebhookInboundException.class, () ->
                verifier.verifyPost(request, "{}".getBytes(StandardCharsets.UTF_8), registration, inbound));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
    }

    @Test
    void verifyPost_hmacSha256_acceptsValidSignature() {
        byte[] body = "{\"id\":\"evt-1\"}".getBytes(StandardCharsets.UTF_8);
        String secret = "hmac-secret";
        String signature = "sha256=" + hmacHex(body, secret);

        TriggerRegistration registration = registrationWithEncryptedSecret(secret);
        WebhookInboundConfig inbound = WebhookInboundConfig.builder()
                .verificationMode(WebhookVerificationMode.HMAC_SHA256)
                .headerName("X-Signature")
                .build();

        when(encryptionService.decrypt("enc_secret")).thenReturn(secret);
        when(request.getHeader("X-Signature")).thenReturn(signature);

        verifier.verifyPost(request, body, registration, inbound);
    }

    @Test
    void verifyPost_hmacSha256_rejectsInvalidSignature() {
        byte[] body = "{\"id\":\"evt-1\"}".getBytes(StandardCharsets.UTF_8);
        String secret = "hmac-secret";

        TriggerRegistration registration = registrationWithEncryptedSecret(secret);
        WebhookInboundConfig inbound = WebhookInboundConfig.builder()
                .verificationMode(WebhookVerificationMode.HMAC_SHA256)
                .headerName("X-Signature")
                .build();

        when(encryptionService.decrypt("enc_secret")).thenReturn(secret);
        when(request.getHeader("X-Signature")).thenReturn("sha256=deadbeef");

        WebhookInboundException ex = assertThrows(WebhookInboundException.class, () ->
                verifier.verifyPost(request, body, registration, inbound));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
    }

    @Test
    void handleChallengeGet_echoesQueryParam() {
        WebhookInboundConfig inbound = WebhookInboundConfig.builder()
                .verificationMode(WebhookVerificationMode.CHALLENGE)
                .challengeQueryParam("challenge")
                .build();

        when(request.getParameter("challenge")).thenReturn("verify-me");

        ResponseEntity<String> response = verifier.handleChallengeGet(request, inbound);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("verify-me", response.getBody());
    }

    private TriggerRegistration registrationWithEncryptedSecret(String plainSecret) {
        return TriggerRegistration.builder()
                .id("reg-1")
                .workflowDefinitionId("def-1")
                .status(TriggerRegistrationStatus.ACTIVE)
                .signingSecret("enc_secret")
                .build();
    }

    private String hmacHex(byte[] body, String secret) {
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
            throw new RuntimeException(e);
        }
    }
}
