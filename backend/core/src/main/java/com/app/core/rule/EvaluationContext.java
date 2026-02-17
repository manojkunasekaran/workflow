package com.app.core.rule;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Context object providing all variables available during rule evaluation.
 * Passed to RuleEvaluator when evaluating conditions.
 */
@Data
@Builder
public class EvaluationContext {

    /**
     * Outputs from all previously executed tasks, keyed by taskId.
     * Example: {"task_1": {"statusCode": 200, "body": {...}}}
     */
    @Builder.Default
    private Map<String, Object> taskOutputs = new HashMap<>();

    /**
     * User-defined workflow variables.
     * Can be set at workflow definition or runtime.
     */
    @Builder.Default
    private Map<String, Object> variables = new HashMap<>();

    /**
     * Current execution timestamp.
     */
    private Instant executionTime;

    /**
     * Current workflow execution ID.
     */
    private String executionId;

    /**
     * Get a value by path (e.g., "task_1.statusCode" or "variables.threshold")
     * 
     * @param path Dot-notation path to the value
     * @return The value at the path, or null if not found
     */
    public Object getValueByPath(String path) {
        if (path == null || path.isEmpty()) {
            return null;
        }

        String[] parts = path.split("\\.", 2);
        String root = parts[0];
        String remaining = parts.length > 1 ? parts[1] : null;

        Object rootValue;
        if ("variables".equals(root)) {
            rootValue = remaining != null ? variables : variables;
            if (remaining != null) {
                return getNestedValue(variables, remaining);
            }
            return variables;
        } else {
            // Assume it's a task ID
            rootValue = taskOutputs.get(root);
            if (remaining != null && rootValue != null) {
                return getNestedValue(rootValue, remaining);
            }
            return rootValue;
        }
    }

    /**
     * Navigate nested objects/maps to get a value.
     */
    @SuppressWarnings("unchecked")
    private Object getNestedValue(Object obj, String path) {
        if (obj == null || path == null || path.isEmpty()) {
            return obj;
        }

        String[] parts = path.split("\\.", 2);
        String key = parts[0];
        String remaining = parts.length > 1 ? parts[1] : null;

        Object value = null;
        if (obj instanceof Map) {
            value = ((Map<String, Object>) obj).get(key);
        } else {
            // For POJOs, we'd use reflection here
            // For now, we assume Map-based structures from JSON
            return null;
        }

        if (remaining != null) {
            return getNestedValue(value, remaining);
        }
        return value;
    }
}
