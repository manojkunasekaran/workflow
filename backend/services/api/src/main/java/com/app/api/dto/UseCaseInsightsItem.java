package com.app.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UseCaseInsightsItem {
    private String workflowDefinitionId;
    private String workflowName;
    private String useCaseTitle;
    private long totalRuns;
    private long completedRuns;
    private long failedRuns;
    private long inProgressRuns;
    private Instant lastRunAt;
}
