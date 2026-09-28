package com.app.api.service.webhook;

import com.app.api.config.properties.WorkflowApiProperties;
import org.springframework.stereotype.Component;

/**
 * Builds the public inbound webhook URL for a workflow id.
 */
@Component
public class WebhookUrlBuilder {

    private final WorkflowApiProperties apiProperties;

    public WebhookUrlBuilder(WorkflowApiProperties apiProperties) {
        this.apiProperties = apiProperties;
    }

    public String buildCallbackUrl(String workflowId) {
        if (workflowId == null || workflowId.isBlank()) {
            throw new IllegalArgumentException("workflowId is required");
        }
        String base = apiProperties.getWebhook().getPublicBaseUrl();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/webhook-events/" + workflowId;
    }
}
