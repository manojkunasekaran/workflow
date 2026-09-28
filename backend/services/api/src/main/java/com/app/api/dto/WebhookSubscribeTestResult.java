package com.app.api.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Preview result from a test subscribe — no external subscription id is persisted.
 */
@Data
@Builder
public class WebhookSubscribeTestResult {
    private boolean success;
    private long durationMs;
    private Integer statusCode;
    private String extractedSubscriptionId;
    private String error;
}
