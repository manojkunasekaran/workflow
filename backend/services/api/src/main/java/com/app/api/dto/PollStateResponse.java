package com.app.api.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * Current poll trigger state for a workflow definition.
 */
@Data
@Builder
public class PollStateResponse {
    private String registrationId;
    private String status;
    private Instant lastPollAt;
    private Instant lastSuccessAt;
    private String lastErrorMessage;
    private int consecutiveFailures;
    private int seenKeyCount;
    private boolean baselineEstablished;
    private String lastResponseHash;
}
