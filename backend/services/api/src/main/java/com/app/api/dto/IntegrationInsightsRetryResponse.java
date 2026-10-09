package com.app.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IntegrationInsightsRetryResponse {
    private String integrationId;
    /** Failed executions in scope before the batch cap is applied. */
    private long eligibleFailedExecutions;
    private int batchLimit;
    /** Failed executions selected for this request (≤ batchLimit). */
    private int selectedForRetry;
    private int queuedCount;
    private int triggerFailureCount;
    private boolean batchLimitApplied;
    private List<IntegrationInsightsRetryItemResult> results;
}
