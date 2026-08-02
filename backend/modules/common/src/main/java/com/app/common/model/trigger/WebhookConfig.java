package com.app.common.model.trigger;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Configuration for a webhook trigger.
 * When active, the platform exposes a URL at {@code /webhooks/{workflowId}}
 * that external systems can POST to in order to start a workflow execution.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebhookConfig {

    /** Optional path suffix appended after the workflowId. */
    @Builder.Default
    private String path = "";

    /** HTTP method the webhook accepts (default: POST). */
    @Builder.Default
    private String method = "POST";

    /** Whether this webhook is currently accepting requests. */
    @Builder.Default
    private boolean active = true;
}
