package com.app.common.model.task.parameters;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Parameters for JOIN task type.
 * Gathers parallel branches created by a BRANCH task and synchronizes
 * them before the workflow continues.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoinTaskParameters implements TaskParameters {

    /**
     * ID of the BRANCH task that created the parallel branches.
     * Used to identify which branches to wait for.
     */
    private String branchTaskId;

    /**
     * Strategy when a branch fails.
     * Defaults to FAIL_FAST.
     */
    @Builder.Default
    private FailureStrategy failureStrategy = FailureStrategy.FAIL_FAST;

    /**
     * Next task ID to execute after all branches complete.
     */
    private String nextTaskId;

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
