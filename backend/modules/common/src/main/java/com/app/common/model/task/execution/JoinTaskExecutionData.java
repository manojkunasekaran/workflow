package com.app.common.model.task.execution;

import com.app.common.constant.TaskExecutionStatus;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.parameters.JoinMergeMode;
import com.app.common.model.task.parameters.JoinTaskParameters;
import com.app.common.model.task.parameters.JoinWaitPolicy;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Captures JOIN task execution details for audit trail.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoinTaskExecutionData implements TaskExecutionData {

    /** ID of the JOIN task. */
    private String joinTaskId;

    /** Total number of inbounds that were joined. */
    private int totalInbounds;

    /** Number of inbounds that completed successfully. */
    private int successfulInbounds;

    /** Number of inbounds that failed. */
    private int failedInbounds;

    /** Per-inbound result summaries. Key = inbound task ID. */
    private Map<String, BranchResult> inboundResults;

    /** Configured wait policy at execution time. */
    private JoinWaitPolicy waitPolicy;

    /** Configured quorum count when wait policy is QUORUM. */
    private Integer quorumCount;

    /** Configured failure strategy at execution time. */
    private JoinTaskParameters.FailureStrategy failureStrategy;

    /** Configured merge mode at execution time. */
    private JoinMergeMode mergeMode;

    /** Inbound task IDs expected by topology at execution time. */
    private List<String> expectedInboundIds;

    /** Inbound task IDs that actually arrived before JOIN executed. */
    private List<String> arrivedInboundIds;

    /** Timestamp when the join started waiting. */
    private Instant joinStartTime;

    /** Timestamp when all inbounds completed. */
    private Instant joinEndTime;

    /** Total wait duration in milliseconds. */
    private long joinDurationMs;

    @Override
    public String getTaskType() {
        return TaskType.JOIN.name();
    }

    @Override
    public Map<String, Object> toOutputMap() {
        Map<String, Object> output = new HashMap<>();
        output.put("totalInbounds", totalInbounds);
        output.put("successfulInbounds", successfulInbounds);
        output.put("failedInbounds", failedInbounds);
        output.put("waitPolicy", waitPolicy != null ? waitPolicy.name() : null);
        output.put("mergeMode", mergeMode != null ? mergeMode.name() : null);
        if (quorumCount != null) {
            output.put("quorumCount", quorumCount);
        }
        if (failureStrategy != null) {
            output.put("failureStrategy", failureStrategy.name());
        }
        if (expectedInboundIds != null) {
            output.put("expectedInboundIds", new ArrayList<>(expectedInboundIds));
        }
        if (arrivedInboundIds != null) {
            output.put("arrivedInboundIds", new ArrayList<>(arrivedInboundIds));
        }

        if (mergeMode == JoinMergeMode.COLLECT_OUTPUTS) {
            Map<String, Object> inboundOutputs = new HashMap<>();
            if (inboundResults != null) {
                for (Map.Entry<String, BranchResult> entry : inboundResults.entrySet()) {
                    if (entry.getValue().getOutput() != null) {
                        inboundOutputs.put(entry.getKey(), entry.getValue().getOutput());
                    }
                }
            }
            output.put("inbounds", inboundOutputs);
            return output;
        }

        if (inboundResults != null) {
            for (BranchResult result : inboundResults.values()) {
                if (result.getOutput() != null) {
                    output.putAll(result.getOutput());
                }
            }
        }
        return output;
    }

    /**
     * Summary result for a single inbound task execution.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BranchResult {
        private String branchName;
        /** Status of the inbound execution. */
        private TaskExecutionStatus status;
        /** Number of tasks executed on this path. */
        private int tasksExecuted;
        /** Last task ID that was executed. */
        private String lastTaskId;
        /** Error message if the path failed. */
        private String errorMessage;
        /** Merged output from the path. */
        private Map<String, Object> output;
    }
}
