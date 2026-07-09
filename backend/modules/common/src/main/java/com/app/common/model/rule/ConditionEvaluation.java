package com.app.common.model.rule;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One evaluated condition or expression in a conditional task audit trace.
 */
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class ConditionEvaluation {

    private ConditionEvaluationKind kind;

    /** Branch name when this evaluation belongs to a conditional branch. */
    private String branchName;

    /** Zero-based branch index in the conditional task configuration. */
    private Integer branchIndex;

    /** Original field path or expression text. */
    private String source;

    /** Resolved expression text after template substitution. */
    private String resolved;

    /** Resolved left-hand / evaluated value. */
    private Object actual;

    /** Expected right-hand value for rule conditions. */
    private Object expected;

    /** Rule operator name, when {@link #kind} is {@link ConditionEvaluationKind#RULE}. */
    private String operator;

    private boolean negated;

    private Boolean matched;

    private String error;
}
