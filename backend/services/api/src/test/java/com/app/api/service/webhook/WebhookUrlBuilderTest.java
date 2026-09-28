package com.app.api.service.webhook;

import com.app.api.config.properties.WorkflowApiProperties;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class WebhookUrlBuilderTest {

    @Test
    void buildCallbackUrl_appendsWorkflowIdToPublicBase() {
        WorkflowApiProperties properties = new WorkflowApiProperties();
        properties.getWebhook().setPublicBaseUrl("https://api.example.com/rest");
        WebhookUrlBuilder builder = new WebhookUrlBuilder(properties);

        assertEquals(
                "https://api.example.com/rest/webhook-events/wf-123",
                builder.buildCallbackUrl("wf-123"));
    }

    @Test
    void buildCallbackUrl_stripsTrailingSlashFromBase() {
        WorkflowApiProperties properties = new WorkflowApiProperties();
        properties.getWebhook().setPublicBaseUrl("https://api.example.com/rest/");
        WebhookUrlBuilder builder = new WebhookUrlBuilder(properties);

        assertEquals(
                "https://api.example.com/rest/webhook-events/wf-123",
                builder.buildCallbackUrl("wf-123"));
    }

    @Test
    void buildCallbackUrl_rejectsBlankWorkflowId() {
        WebhookUrlBuilder builder = new WebhookUrlBuilder(new WorkflowApiProperties());

        assertThrows(IllegalArgumentException.class, () -> builder.buildCallbackUrl(" "));
    }
}
