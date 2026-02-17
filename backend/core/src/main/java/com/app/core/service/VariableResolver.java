package com.app.core.service;

import com.app.core.model.ExecutionContext;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Centralized service for resolving variable expressions in task parameters.
 * 
 * Expression Syntax: {{$source.path.to.field}}
 * 
 * Sources:
 * - $input: Trigger inputs (e.g., {{$input.customer_id}})
 * - $variables: Workflow-level variables (e.g., {{$variables.api_base_url}})
 * - $tasks.<taskId>: Task outputs (e.g.,
 * {{$tasks.fetch_user.response.body.email}})
 * - $env: Environment variables (e.g., {{$env.API_KEY}})
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VariableResolver {

    // Pattern to match {{expression}} with optional whitespace
    private static final Pattern EXPRESSION_PATTERN = Pattern.compile("\\{\\{\\s*(.+?)\\s*\\}\\}");

    private final ObjectMapper objectMapper;

    /**
     * Resolve all expressions in a template string.
     * 
     * @param template String potentially containing {{expression}} placeholders
     * @param context  ExecutionContext with all variable sources
     * @return Resolved string with all expressions replaced
     */
    public String resolveString(String template, ExecutionContext context) {
        if (template == null || template.isEmpty()) {
            return template;
        }

        // Check if template contains any expressions
        if (!template.contains("{{")) {
            return template;
        }

        Matcher matcher = EXPRESSION_PATTERN.matcher(template);
        StringBuilder result = new StringBuilder();

        while (matcher.find()) {
            String expression = matcher.group(1).trim();
            Object resolved = resolveExpression(expression, context);

            // Convert resolved value to string for template substitution
            String replacement = convertToString(resolved);
            matcher.appendReplacement(result, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(result);

        return result.toString();
    }

    /**
     * core.service.VariableResolver#resolveValue
     * Resolves a value that could be a literal, a strict expression {{...}}, or a
     * template string "foo {{...}}".
     * This is the standard entry point for resolving rule fields and values.
     */
    public Object resolveValue(Object value, ExecutionContext context) {
        if (!(value instanceof String strValue)) {
            return value;
        }

        if (strValue.trim().isEmpty()) {
            return strValue;
        }

        // Check for strict expression: exactly one {{...}} wrapping the whole string
        Matcher matcher = EXPRESSION_PATTERN.matcher(strValue.trim());
        if (matcher.find()) {
            // Match found. Verify it covers the entire string
            if (matcher.start() == 0 && matcher.end() == strValue.trim().length()) {
                return resolveExpression(matcher.group(1), context);
            }
        }

        // If it contains {{ but is not a strict expression, resolve as template string
        if (strValue.contains("{{")) {
            return resolveString(strValue, context);
        }

        // Return as is (literal)
        return strValue;
    }

    /**
     * Resolve a single expression and return the raw value.
     * 
     * @param expression Expression without {{ }} wrapper (e.g., "$input.name")
     * @param context    ExecutionContext with all variable sources
     * @return Resolved value (could be any type)
     */
    public Object resolveExpression(String expression, ExecutionContext context) {
        if (expression == null || expression.isEmpty()) {
            return null;
        }

        log.debug("Resolving expression: {}", expression);

        // Parse the expression to determine source and path
        String[] parts = expression.split("\\.", 2);
        String source = parts[0];
        String path = parts.length > 1 ? parts[1] : null;

        Object rootValue = getRootValue(source, path, context);

        if (rootValue == null) {
            log.warn("Could not resolve source '{}' from expression '{}'", source, expression);
            return null;
        }

        // If there's a remaining path, navigate into the object
        if (path != null && !source.equals("$tasks")) {
            return getNestedValue(rootValue, path);
        }

        return rootValue;
    }

    /**
     * Resolve all expressions in a Map (e.g., headers, body objects).
     * Recursively processes nested maps.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> resolveMap(Map<String, Object> map, ExecutionContext context) {
        if (map == null) {
            return null;
        }

        Map<String, Object> resolved = new HashMap<>();
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            String key = resolveString(entry.getKey(), context);
            Object value = entry.getValue();

            if (value instanceof String) {
                resolved.put(key, resolveString((String) value, context));
            } else if (value instanceof Map) {
                resolved.put(key, resolveMap((Map<String, Object>) value, context));
            } else {
                resolved.put(key, value);
            }
        }
        return resolved;
    }

    /**
     * Get the root value for a given source prefix.
     */
    private Object getRootValue(String source, String path, ExecutionContext context) {
        return switch (source) {
            case "$input" -> context.getTriggerInputs();
            case "$variables" -> context.getWorkflowVariables();
            case "$env" -> context.getEnvironmentVariables();
            case "$loop" -> context.getLoopVariables();
            case "$tasks" -> {
                // For $tasks, we need to extract taskId from path
                if (path == null) {
                    yield context.getTaskOutputs();
                }
                String[] taskParts = path.split("\\.", 2);
                String taskId = taskParts[0];
                Object taskOutput = context.getTaskOutputs().get(taskId);

                if (taskParts.length > 1) {
                    yield getNestedValue(taskOutput, taskParts[1]);
                }
                yield taskOutput;
            }
            default -> {
                log.warn("Unknown variable source: {}", source);
                yield null;
            }
        };
    }

    /**
     * Navigate nested objects/maps to get a value by dot-notation path.
     * Handles VariableValue objects by extracting their actual value.
     */
    @SuppressWarnings("unchecked")
    private Object getNestedValue(Object obj, String path) {
        if (obj == null || path == null || path.isEmpty()) {
            return obj;
        }

        // If we encounter a VariableValue, extract its actual value
        if (obj instanceof com.app.common.model.variable.VariableValue) {
            obj = ((com.app.common.model.variable.VariableValue) obj).getValue();
            if (obj == null) {
                return null;
            }
        }

        String[] parts = path.split("\\.", 2);
        String key = parts[0];
        String remaining = parts.length > 1 ? parts[1] : null;

        Object value = null;
        if (obj instanceof Map) {
            value = ((Map<String, Object>) obj).get(key);
            // Handle VariableValue in maps
            if (value instanceof com.app.common.model.variable.VariableValue) {
                value = ((com.app.common.model.variable.VariableValue) value).getValue();
            }
        } else {
            // For non-Map objects, we could add reflection support here
            log.debug("Cannot navigate into non-Map object for key: {}", key);
            return null;
        }

        if (remaining != null && value != null) {
            return getNestedValue(value, remaining);
        }
        return value;
    }

    /**
     * Convert any value to a string representation for template substitution.
     */
    private String convertToString(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof String) {
            return (String) value;
        }
        if (value instanceof Number || value instanceof Boolean) {
            return value.toString();
        }
        // For complex objects (Map, List), serialize to JSON
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize value to JSON: {}", e.getMessage());
            return value.toString();
        }
    }
}
