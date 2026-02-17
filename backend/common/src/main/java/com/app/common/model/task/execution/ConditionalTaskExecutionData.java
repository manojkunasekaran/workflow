package com.app.common.model.task.execution;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import com.app.common.model.task.TaskType;
import com.app.common.model.variable.VariableValue;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

/**
 * Captures conditional task execution details for audit trail.
 * Stores the evaluation input, result, and branch metrics.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConditionalTaskExecutionData implements TaskExecutionData {

    /** Task outputs available during evaluation (snapshot of $tasks context) */
    private Map<String, Object> taskOutputsSnapshot;

    /**
     * Workflow variables available during evaluation (snapshot of $variables
     * context)
     */
    private Map<String, VariableValue> variablesSnapshot;

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
