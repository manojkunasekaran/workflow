package com.app.common.model.rule;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a single condition in a rule.
 * The data type is auto-detected at evaluation time from the actual field
 * value.
 * 
 * Example conditions:
 * - field: "task_1.statusCode", operator: EQUALS, value: 200
 * - field: "task_2.body.user.verified", operator: IS_TRUE
 * - field: "task_3.items", operator: ARRAY_CONTAINS, value: "premium"
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RuleCondition {

    /**
     * JSON path to the field to evaluate.
     * Supports dot notation for nested objects.
     * Examples: "task_1.statusCode", "task_2.body.user.email"
     */
    private String field;

    /**
     * Comparison operator to apply.
     */
    private Operator operator;

    /**
     * Expected value to compare against.
     * For BETWEEN operator, this should be a List with [min, max].
     * For IN/NOT_IN, this should be a List of values.
     * Type coercion is handled at runtime.
     */
    private Object value;

    /**
     * If true, the result of this condition is inverted.
     * Useful for complex negation without requiring separate NOT_* operators.
     */
    @Builder.Default
    private boolean negated = false;
}
