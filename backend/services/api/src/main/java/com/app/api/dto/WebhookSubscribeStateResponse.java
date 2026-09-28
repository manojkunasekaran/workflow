package com.app.api.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * Current managed webhook subscribe trigger state for a workflow definition.
 */
@Data
@Builder
public class WebhookSubscribeStateResponse {
    private String registrationId;
    private String webhookUrl;
    private String status;
    private boolean hasExternalSubscription;
    private Instant lastSubscribeAt;
    private Instant lastUnsubscribeAt;
    private Instant lastInboundAt;
    private String lastErrorMessage;
    private int consecutiveFailures;
}
