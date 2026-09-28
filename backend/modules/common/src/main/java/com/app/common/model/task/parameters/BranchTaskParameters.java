package com.app.common.model.task.parameters;

import com.app.common.model.task.TaskRefs;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Parameters for BRANCH task type.
 * Creates multiple parallel execution paths (fan-out only).
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

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParallelBranch {
        /** Human-readable name for this branch. */
        private String branchName;
        /** Task ID of the first task in this branch. */
        private String startTaskId;

        public void setStartTaskId(String startTaskId) {
            this.startTaskId = TaskRefs.normalize(startTaskId);
        }
    }
}
