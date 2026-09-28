package com.app.api.service.webhook;

import com.app.common.model.trigger.PollHttpConfig;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Substitutes template placeholders in outbound subscribe/unsubscribe HTTP config.
 */
public final class SubscribeTemplateRenderer {

    public static final String CALLBACK_URL = "callbackUrl";
    public static final String SECRET = "secret";
    public static final String SUBSCRIPTION_ID = "subscriptionId";

    private SubscribeTemplateRenderer() {
    }

    public static PollHttpConfig render(PollHttpConfig source, Map<String, String> values) {
        if (source == null) {
            return null;
        }
        Map<String, String> safeValues = values != null ? values : Map.of();

        Map<String, String> renderedHeaders = new HashMap<>();
        if (source.getHeaders() != null) {
            source.getHeaders().forEach((key, value) ->
                    renderedHeaders.put(key, substitute(value, safeValues)));
        }

        return PollHttpConfig.builder()
                .url(substitute(source.getUrl(), safeValues))
                .method(source.getMethod())
                .headers(renderedHeaders)
                .body(substitute(source.getBody(), safeValues))
                .timeoutMs(source.getTimeoutMs())
                .credentialId(source.getCredentialId())
                .build();
    }

    static String substitute(String template, Map<String, String> values) {
        if (template == null) {
            return null;
        }
        String result = template;
        for (Map.Entry<String, String> entry : values.entrySet()) {
            String placeholder = "{{" + entry.getKey() + "}}";
            result = result.replace(placeholder, Objects.toString(entry.getValue(), ""));
        }
        return result;
    }
}
