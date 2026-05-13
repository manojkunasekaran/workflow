package com.app.common.model.rule;

import java.util.Map;

/**
 * Result of evaluating a rule, condition, or expression.
 * Includes both the boolean outcome and a map containing only the specific
 * fields
 * and resolved values that were evaluated. This prevents needing to snapshot
 * the entire workflow context.
 * 
 * @param matched         true if the condition(s) passed
 * @param evaluatedFields map of field expressions to their resolved values
 */
public record EvaluationResult(
        boolean matched,
        Map<String, Object> evaluatedFields) {
}
