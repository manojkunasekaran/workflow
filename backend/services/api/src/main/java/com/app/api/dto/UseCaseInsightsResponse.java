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
public class UseCaseInsightsResponse {
    private String integrationId;
    private String workflowDefinitionId;
    private String workflowName;
    private String useCaseTitle;
    private String useCaseDescription;
    private long totalRuns;
    private long completedRuns;
    private long failedRuns;
    private long inProgressRuns;
    private Instant lastRunAt;
    private List<RecentExecutionInsightItem> recentExecutions;
}
