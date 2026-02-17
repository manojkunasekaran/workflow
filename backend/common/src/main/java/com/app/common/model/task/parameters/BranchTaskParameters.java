package com.app.common.model.task.parameters;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Parameters for BRANCH task type.
 * Creates multiple parallel execution paths that can optionally
 * be gathered by a JOIN task.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BranchTaskParameters implements TaskParameters {

    /**
     * List of parallel branches to execute.
     * Each branch defines a name and starting task ID.
     */
    private List<ParallelBranch> branches;

    /**
     * OPTIONAL: ID of the JOIN task that will gather all branches.
     * - If specified: Each branch executes until it reaches the join task.
     * - If null: Each branch executes to the end of the workflow or until
     * completion.
     */
    private String joinTaskId;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParallelBranch {
        /** Human-readable name for this branch. */
        private String branchName;
        /** Task ID of the first task in this branch. */
        private String startTaskId;
    }
}
