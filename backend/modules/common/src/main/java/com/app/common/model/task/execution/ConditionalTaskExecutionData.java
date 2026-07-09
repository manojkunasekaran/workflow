package com.app.common.model.task.execution;

import com.app.common.model.rule.ConditionEvaluation;
import com.app.common.model.task.TaskType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Captures conditional task execution details for audit trail.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConditionalTaskExecutionData implements TaskExecutionData {

    /** Ordered trace of condition and expression evaluations. */
    private List<ConditionEvaluation> evaluations;

    /** Name of the branch that matched (or "default" if no condition matched) */
    private String matchedBranch;

    /** The task ID that will be executed next */
    private String nextTaskId;

    /** Number of branches evaluated before finding a match */
    private int branchesEvaluated;

    /** Total number of branches configured */
    private int totalBranches;

    @Override
    public String getTaskType() {
        return TaskType.CONDITIONAL.name();
    }

    @Override
    public Map<String, Object> toOutputMap() {
        Map<String, Object> output = new HashMap<>();
        output.put("matchedBranch", matchedBranch);
        output.put("nextTaskId", nextTaskId);
        output.put("branchMatched", !"default".equals(matchedBranch));
        return output;
    }
}
