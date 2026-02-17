package com.app.common.model.task.execution;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import com.app.common.model.task.TaskType;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Captures BRANCH task execution details for audit trail.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BranchTaskExecutionData implements TaskExecutionData {

    /** Number of parallel branches created. */
    private int branchesCreated;

    /** IDs of the branches that were created (for tracking/correlation). */
    private List<String> branchIds;

    /** ID of the JOIN task that will gather branches (may be null). */
    private String joinTaskId;

    /** Timestamp when branches were spawned. */
    private Instant branchStartTime;

    @Override
    public String getTaskType() {
        return TaskType.BRANCH.name();
    }

    @Override
    public Map<String, Object> toOutputMap() {
        Map<String, Object> output = new HashMap<>();
        output.put("branchesCreated", branchesCreated);
        output.put("branchIds", branchIds);
        output.put("joinTaskId", joinTaskId);
        return output;
    }
}
