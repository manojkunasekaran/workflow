package com.app.common.model.task.parameters;

import com.app.common.model.rule.RuleGroup;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Parameters for CONDITIONAL task type.
 * Supports complex branching logic with rule-based conditions.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConditionalTaskParameters implements TaskParameters {

    /**
     * Ordered list of branches to evaluate.
     * First matching branch is taken.
     */
    private List<Branch> branches;

    /**
     * Fallback task ID if no branch conditions match.
     */
    private String defaultNextTaskId;

    /**
     * Represents a single branch in a conditional task.
     * Priority: rules (structured) > expression (raw SpEL)
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Branch {
        /**
         * Human-readable name for this branch (for UI display).
         */
        private String name;

        /**
         * Structured rules for visual builder (primary).
         * Auto-compiled to SpEL at evaluation time.
         */
        private RuleGroup rules;

        /**
         * Raw SpEL expression for power users (secondary).
         * Used only if rules is null.
         * Example: "#input.status == 'approved' && #input.amount > 1000"
         */
        private String expression;

        /**
         * Task ID to execute if this branch's conditions are met.
         */
        private String nextTaskId;
    }
}
