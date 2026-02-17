package com.app.common.model.rule;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * A group of conditions combined with a logical operator (AND/OR).
 * Supports nested groups for complex logic like: (A AND B) OR (C AND D)
 * 
 * Evaluation rules:
 * - AND: All conditions must be true
 * - OR: At least one condition must be true
 * - Empty group evaluates to true (no constraints)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RuleGroup {

    /**
     * How to combine conditions within this group.
     * Defaults to AND for stricter matching.
     */
    @Builder.Default
    private LogicalOperator operator = LogicalOperator.AND;

    /**
     * List of conditions in this group.
     */
    @Builder.Default
    private List<RuleCondition> conditions = new ArrayList<>();

    /**
     * Nested groups for complex logic.
     * Each nested group is evaluated first, then combined with this group's
     * operator.
     */
    @Builder.Default
    private List<RuleGroup> nestedGroups = new ArrayList<>();

    /**
     * Convenience method to add a condition to this group.
     */
    public RuleGroup addCondition(RuleCondition condition) {
        if (this.conditions == null) {
            this.conditions = new ArrayList<>();
        }
        this.conditions.add(condition);
        return this;
    }

    /**
     * Convenience method to add a nested group.
     */
    public RuleGroup addNestedGroup(RuleGroup group) {
        if (this.nestedGroups == null) {
            this.nestedGroups = new ArrayList<>();
        }
        this.nestedGroups.add(group);
        return this;
    }

    /**
     * Check if this group has any conditions or nested groups.
     */
    public boolean isEmpty() {
        return (conditions == null || conditions.isEmpty())
                && (nestedGroups == null || nestedGroups.isEmpty());
    }
}
