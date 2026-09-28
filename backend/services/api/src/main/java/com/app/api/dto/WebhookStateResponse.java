package com.app.api.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * Current passive webhook trigger state for a workflow definition.
 */
@Data
@Builder
public class WebhookStateResponse {
    private String registrationId;
    private String webhookUrl;
    private String status;
    private Instant lastInboundAt;
    private int consecutiveFailures;
}
