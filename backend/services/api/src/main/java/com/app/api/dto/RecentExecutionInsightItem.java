package com.app.api.dto;

import com.app.common.constant.WorkflowExecutionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecentExecutionInsightItem {
    private String executionId;
    private WorkflowExecutionStatus status;
    private Instant startTime;
    private Instant endTime;
}
