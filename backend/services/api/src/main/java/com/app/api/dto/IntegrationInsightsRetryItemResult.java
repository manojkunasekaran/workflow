package com.app.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IntegrationInsightsRetryItemResult {
    private String sourceExecutionId;
    private String workflowDefinitionId;
    private String newExecutionId;
    private boolean queued;
    private String errorMessage;
}
