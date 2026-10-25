package com.app.api.service.form;

import com.app.common.exception.ValidationException;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

@Service
public class FormSessionTokenService {

    private static final long TTL_SECONDS = 3600;

    public String issueToken(String signingSecret, String executionId, String currentTaskId) {
        long exp = Instant.now().getEpochSecond() + TTL_SECONDS;
        String payload = executionId + "|" + currentTaskId + "|" + exp;
        String sig = sign(signingSecret, payload);
        return Base64.getUrlEncoder().withoutPadding().encodeToString((payload + "|" + sig).getBytes(StandardCharsets.UTF_8));
    }

    public ParsedFormSession parseAndValidate(String signingSecret, String token) {
        if (token == null || token.isBlank()) {
            throw new ValidationException("Missing form session token");
        }
        String decoded = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8);
        String[] parts = decoded.split("\\|");
        if (parts.length != 4) {
            throw new ValidationException("Invalid form session token");
        }
        String executionId = parts[0];
        String currentTaskId = parts[1];
        long exp = Long.parseLong(parts[2]);
        String sig = parts[3];
        String payload = executionId + "|" + currentTaskId + "|" + exp;
        if (!sign(signingSecret, payload).equals(sig)) {
            throw new ValidationException("Invalid form session signature");
        }
        if (Instant.now().getEpochSecond() > exp) {
            throw new ValidationException("Form session expired");
        }
        return new ParsedFormSession(executionId, currentTaskId);
    }

    private static String sign(String secret, String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Unable to sign form session", e);
        }
    }

    public record ParsedFormSession(String executionId, String currentTaskId) {}
}
