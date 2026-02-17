package com.app.common.model.task.execution;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import com.app.common.model.task.TaskType;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Captures JOIN task execution details for audit trail.
 * Records branch completion status, timing, and merged outputs.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoinTaskExecutionData implements TaskExecutionData {

    /** ID of the BRANCH task that created the parallel branches. */
    private String branchTaskId;

    /** Total number of branches that were joined. */
    private int totalBranches;

    /** Number of branches that completed successfully. */
    private int successfulBranches;

    /** Number of branches that failed. */
    private int failedBranches;

    /** Per-branch result summaries. Key = branchName. */
    private Map<String, BranchResult> branchResults;

    /** Timestamp when the join started waiting. */
    private Instant joinStartTime;

    /** Timestamp when all branches completed. */
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
        output.put("totalBranches", totalBranches);
        output.put("successfulBranches", successfulBranches);
        output.put("failedBranches", failedBranches);

        // Collect individual branch outputs under branch names
        Map<String, Object> branchOutputs = new HashMap<>();
        if (branchResults != null) {
            for (Map.Entry<String, BranchResult> entry : branchResults.entrySet()) {
                if (entry.getValue().getOutput() != null) {
                    branchOutputs.put(entry.getKey(), entry.getValue().getOutput());
                }
            }
        }
        output.put("branches", branchOutputs);
        return output;
    }

    /**
     * Summary result for a single branch execution.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BranchResult {
        private String branchName;
        /** COMPLETED or FAILED */
        private String status;
        /** Number of tasks executed in this branch. */
        private int tasksExecuted;
        /** Last task ID that was executed. */
        private String lastTaskId;
        /** Error message if the branch failed. */
        private String errorMessage;
        /** Merged output from the branch. */
        private Map<String, Object> output;
    }
}
