package com.app.common.model.rule;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Result of evaluating a rule, condition, or expression.
 */
public record EvaluationResult(
        boolean matched,
        List<ConditionEvaluation> evaluations) {

    public EvaluationResult {
        evaluations = evaluations == null
                ? List.of()
                : List.copyOf(evaluations);
    }

    public static EvaluationResult of(boolean matched, List<ConditionEvaluation> evaluations) {
        return new EvaluationResult(matched, evaluations);
    }

    public static EvaluationResult matched(List<ConditionEvaluation> evaluations) {
        return new EvaluationResult(true, evaluations);
    }

    public static EvaluationResult notMatched(List<ConditionEvaluation> evaluations) {
        return new EvaluationResult(false, evaluations);
    }

    public EvaluationResult withBranchName(String branchName) {
        if (branchName == null || branchName.isBlank() || evaluations.isEmpty()) {
            return this;
        }
        List<ConditionEvaluation> tagged = evaluations.stream()
                .map(entry -> entry.toBuilder().branchName(branchName).build())
                .toList();
        return new EvaluationResult(matched, tagged);
    }

    public static List<ConditionEvaluation> merge(List<ConditionEvaluation> first, List<ConditionEvaluation> second) {
        if (first.isEmpty()) {
            return second == null ? List.of() : List.copyOf(second);
        }
        if (second == null || second.isEmpty()) {
            return List.copyOf(first);
        }
        List<ConditionEvaluation> merged = new ArrayList<>(first);
        merged.addAll(second);
        return Collections.unmodifiableList(merged);
    }
}
