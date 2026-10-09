package com.app.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IntegrationInsightsResponse {
    private String integrationId;
    private int useCaseCount;
    private long totalRuns;
    private long completedRuns;
    private long failedRuns;
    private long inProgressRuns;
    private Instant lastRunAt;
    private List<UseCaseInsightsItem> useCases;
}
