package com.app.common.model.task.parameters;

import com.app.common.model.task.TaskRefs;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Parameters for JOIN task type.
 * Gathers wired inbound tasks and synchronizes them before the workflow continues.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoinTaskParameters implements TaskParameters {

    /**
     * Ordered list of task IDs wired into join-merge (fan-in sources).
     */
    @Builder.Default
    private List<String> inboundTaskIds = new ArrayList<>();

    /**
     * How many inbounds must arrive before JOIN continues.
     */
    @Builder.Default
    private JoinWaitPolicy waitPolicy = JoinWaitPolicy.ALL;

    /**
     * Required when {@link #waitPolicy} is {@link JoinWaitPolicy#QUORUM}.
     */
    private Integer quorumCount;

    /**
     * Strategy when a branch fails.
     */
    @Builder.Default
    private FailureStrategy failureStrategy = FailureStrategy.FAIL_FAST;

    /**
     * How inbound outputs are merged.
     */
    @Builder.Default
    private JoinMergeMode mergeMode = JoinMergeMode.PASS_THROUGH;

    /**
     * Optional per-JOIN barrier wait timeout in milliseconds.
     * When unset, the engine default ({@code workflow.engine.join-barrier-timeout-ms}) applies.
     */
    private Long barrierTimeoutMs;

    /**
     * Next task ID to execute after the join barrier is satisfied.
     */
    private String nextTaskId;

    public void setNextTaskId(String nextTaskId) {
        this.nextTaskId = TaskRefs.normalize(nextTaskId);
    }

    public void setInboundTaskIds(List<String> inboundTaskIds) {
        if (inboundTaskIds == null) {
            this.inboundTaskIds = new ArrayList<>();
            return;
        }
        this.inboundTaskIds = new ArrayList<>();
        for (String id : inboundTaskIds) {
            String normalized = TaskRefs.normalize(id);
            if (normalized != null && !normalized.isBlank()) {
                this.inboundTaskIds.add(normalized);
            }
        }
    }

    public enum FailureStrategy {
        /** Cancel all running branches and fail immediately on first failure. */
        FAIL_FAST,
        /**
         * Wait for all branches to complete; succeed if at least one branch succeeds.
         */
        WAIT_FOR_ALL,
        /** All branches must succeed for the workflow to continue. */
        REQUIRE_ALL
    }
}
