package com.app.api.service.webhook;

import com.app.common.model.trigger.PollHttpConfig;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class SubscribeTemplateRendererTest {

    @Test
    void render_substitutesUrlHeadersAndBody() {
        PollHttpConfig source = PollHttpConfig.builder()
                .url("https://vendor.example.com/subscribe?callback={{callbackUrl}}")
                .method("POST")
                .body("{\"secret\":\"{{secret}}\",\"subscription\":\"{{subscriptionId}}\"}")
                .build();
        source.getHeaders().put("X-Callback", "{{callbackUrl}}");

        PollHttpConfig rendered = SubscribeTemplateRenderer.render(source, Map.of(
                SubscribeTemplateRenderer.CALLBACK_URL, "https://api.example.com/webhook-events/token",
                SubscribeTemplateRenderer.SECRET, "s3cr3t",
                SubscribeTemplateRenderer.SUBSCRIPTION_ID, "sub-42"));

        assertEquals(
                "https://vendor.example.com/subscribe?callback=https://api.example.com/webhook-events/token",
                rendered.getUrl());
        assertEquals("https://api.example.com/webhook-events/token", rendered.getHeaders().get("X-Callback"));
        assertEquals("{\"secret\":\"s3cr3t\",\"subscription\":\"sub-42\"}", rendered.getBody());
    }

    @Test
    void render_returnsNullForNullSource() {
        assertNull(SubscribeTemplateRenderer.render(null, Map.of()));
    }

    @Test
    void substitute_leavesUnknownPlaceholdersUntouched() {
        String result = SubscribeTemplateRenderer.substitute(
                "keep {{unknown}}", Map.of(SubscribeTemplateRenderer.SECRET, "value"));
        assertEquals("keep {{unknown}}", result);
    }
}
