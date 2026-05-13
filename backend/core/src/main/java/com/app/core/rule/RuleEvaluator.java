package com.app.core.rule;

import com.app.common.model.task.parameters.ConditionalTaskParameters.Branch;
import com.app.common.model.rule.EvaluationResult;
import com.app.common.model.rule.LogicalOperator;
import com.app.common.model.rule.Operator;
import com.app.common.model.rule.RuleCondition;
import com.app.common.model.rule.RuleGroup;
import com.app.core.model.ExecutionContext;
import com.app.core.service.VariableResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.SimpleEvaluationContext;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Service for evaluating rule conditions against an execution context.
 * 
 * Supports two modes:
 * 1. Structured rules (RuleGroup) - compiled internally to optimized evaluation
 * 2. Raw SpEL expressions - parsed and evaluated directly
 * 
 * Performance optimizations:
 * - Expression caching for frequently used SpEL expressions
 * - Short-circuit evaluation for AND/OR groups
 * - Type coercion with caching
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RuleEvaluator {

    private final VariableResolver variableResolver;
    private final ExpressionParser spelParser = new SpelExpressionParser();

    // Cache for compiled SpEL expressions
    private final Map<String, Expression> expressionCache = new ConcurrentHashMap<>();

    // Cache for compiled regex patterns
    private final Map<String, Pattern> regexCache = new ConcurrentHashMap<>();

    /**
     * Evaluate a branch's conditions against the given context.
     * Priority: rules (structured) > expression (raw SpEL)
     * 
     * @param branch  The branch to evaluate
     * @param context The evaluation context with task outputs and variables
     * @return true if the branch conditions are met
     */
    public EvaluationResult evaluate(Branch branch, ExecutionContext context) {
        if (branch == null) {
            return new EvaluationResult(false, new HashMap<>());
        }

        // Priority 1: Structured rules
        if (branch.getRules() != null && !branch.getRules().isEmpty()) {
            return evaluateRuleGroup(branch.getRules(), context);
        }

        // Priority 2: Raw SpEL expression
        if (branch.getExpression() != null && !branch.getExpression().isBlank()) {
            return evaluateExpression(branch.getExpression(), context);
        }

        // No conditions defined - consider it always true (passthrough)
        log.warn("Branch '{}' has no rules or expression defined, defaulting to true",
                branch.getName());
        return new EvaluationResult(true, new HashMap<>());
    }

    /**
     * Evaluate a rule group (AND/OR combination of conditions).
     */
    public EvaluationResult evaluateRuleGroup(RuleGroup group, ExecutionContext context) {
        if (group == null || group.isEmpty()) {
            return new EvaluationResult(true, new HashMap<>());
        }

        LogicalOperator operator = group.getOperator() != null
                ? group.getOperator()
                : LogicalOperator.AND;

        boolean hasConditions = group.getConditions() != null && !group.getConditions().isEmpty();
        boolean hasNestedGroups = group.getNestedGroups() != null && !group.getNestedGroups().isEmpty();

        Map<String, Object> evaluatedFields = new HashMap<>();

        if (operator == LogicalOperator.AND) {
            if (hasConditions) {
                for (RuleCondition condition : group.getConditions()) {
                    EvaluationResult res = evaluateCondition(condition, context);
                    evaluatedFields.putAll(res.evaluatedFields());
                    if (!res.matched()) {
                        return new EvaluationResult(false, evaluatedFields);
                    }
                }
            }
            if (hasNestedGroups) {
                for (RuleGroup nested : group.getNestedGroups()) {
                    EvaluationResult res = evaluateRuleGroup(nested, context);
                    evaluatedFields.putAll(res.evaluatedFields());
                    if (!res.matched()) {
                        return new EvaluationResult(false, evaluatedFields);
                    }
                }
            }
            return new EvaluationResult(true, evaluatedFields);
        } else {
            if (hasConditions) {
                for (RuleCondition condition : group.getConditions()) {
                    EvaluationResult res = evaluateCondition(condition, context);
                    evaluatedFields.putAll(res.evaluatedFields());
                    if (res.matched()) {
                        return new EvaluationResult(true, evaluatedFields);
                    }
                }
            }
            if (hasNestedGroups) {
                for (RuleGroup nested : group.getNestedGroups()) {
                    EvaluationResult res = evaluateRuleGroup(nested, context);
                    evaluatedFields.putAll(res.evaluatedFields());
                    if (res.matched()) {
                        return new EvaluationResult(true, evaluatedFields);
                    }
                }
            }
            return new EvaluationResult(!hasConditions && !hasNestedGroups, evaluatedFields);
        }
    }

    /**
     * Evaluate a single condition.
     */
    public EvaluationResult evaluateCondition(RuleCondition condition, ExecutionContext context) {
        if (condition == null) {
            return new EvaluationResult(true, new HashMap<>());
        }

        // 1. Resolve the Field (LHS)
        // STRICT STANDARD APPROACH: Field must be an expression {{...}} if it refers to
        // a variable
        Object fieldValue = variableResolver.resolveValue(condition.getField(), context);

        // 2. Resolve the Value (RHS)
        Object expectedValue = variableResolver.resolveValue(condition.getValue(), context);

        Operator operator = condition.getOperator();

        boolean result = evaluateOperator(fieldValue, operator, expectedValue);

        // Apply negation if specified
        if (condition.isNegated()) {
            result = !result;
        }

        log.debug("Condition: {} ({}) {} {} = {} (negated: {})",
                condition.getField(), fieldValue, operator, expectedValue, result, condition.isNegated());

        Map<String, Object> fields = new HashMap<>();
        fields.put(String.valueOf(condition.getField()), fieldValue);
        if (condition.getValue() != null && !String.valueOf(condition.getValue()).isEmpty()) {
            fields.put(String.valueOf(condition.getValue()), expectedValue);
        }

        return new EvaluationResult(result, fields);
    }

    /**
     * Evaluate a raw SpEL expression.
     */
    public EvaluationResult evaluateExpression(String expressionStr, ExecutionContext context) {
        try {
            Expression expression = expressionCache.computeIfAbsent(expressionStr,
                    spelParser::parseExpression);

            SimpleEvaluationContext spelContext = createSpelContext(context);
            Boolean result = expression.getValue(spelContext, Boolean.class);
            boolean matched = Boolean.TRUE.equals(result);

            return new EvaluationResult(matched, Map.of(expressionStr, matched));
        } catch (Exception e) {
            log.error("Failed to evaluate SpEL expression: {}", expressionStr, e);
            return new EvaluationResult(false, Map.of(expressionStr, "ERROR: " + e.getMessage()));
        }
    }

    /**
     * Create SpEL evaluation context with variables from our context.
     */
    private SimpleEvaluationContext createSpelContext(ExecutionContext context) {
        SimpleEvaluationContext spelContext = SimpleEvaluationContext.forReadOnlyDataBinding().build();

        // Add task outputs as variables (accessible via #taskId.field)
        context.getTaskOutputs().forEach(spelContext::setVariable);

        // Add workflow variables (accessible via #variables.key) -> unwrapped
        Map<String, Object> simpleVars = new HashMap<>();
        context.getWorkflowVariables().forEach((k, v) -> {
            if (v != null)
                simpleVars.put(k, v.getValue());
        });
        spelContext.setVariable("variables", simpleVars);

        // Add trigger inputs -> unwrapped
        Map<String, Object> simpleInputs = new HashMap<>();
        context.getTriggerInputs().forEach((k, v) -> {
            if (v != null)
                simpleInputs.put(k, v.getValue());
        });
        spelContext.setVariable("input", simpleInputs);

        // Add execution metadata
        spelContext.setVariable("executionTime", context.getExecutionTime());
        spelContext.setVariable("executionId", context.getWorkflowExecutionId());

        return spelContext;
    }

    /**
     * Core operator evaluation logic with auto type detection.
     */
    @SuppressWarnings("unchecked")
    private boolean evaluateOperator(Object fieldValue, Operator operator, Object expectedValue) {
        if (operator == null) {
            return true;
        }

        switch (operator) {
            // Null checks
            case IS_NULL:
                return fieldValue == null;
            case IS_NOT_NULL:
                return fieldValue != null;

            // Boolean checks
            case IS_TRUE:
                return Boolean.TRUE.equals(toBoolean(fieldValue));
            case IS_FALSE:
                return Boolean.FALSE.equals(toBoolean(fieldValue));

            // Empty checks (for strings and collections)
            case IS_EMPTY:
                return isEmpty(fieldValue);
            case IS_NOT_EMPTY:
                return !isEmpty(fieldValue);

            // Equality (works with any type)
            case EQUALS:
                return isEquals(fieldValue, expectedValue);
            case NOT_EQUALS:
                return !isEquals(fieldValue, expectedValue);

            // String operations
            case CONTAINS:
                return stringContains(fieldValue, expectedValue);
            case NOT_CONTAINS:
                return !stringContains(fieldValue, expectedValue);
            case STARTS_WITH:
                return stringStartsWith(fieldValue, expectedValue);
            case ENDS_WITH:
                return stringEndsWith(fieldValue, expectedValue);
            case MATCHES_REGEX:
                return matchesRegex(fieldValue, expectedValue);

            // Numeric comparisons
            case GREATER_THAN:
                return compareNumbers(fieldValue, expectedValue) > 0;
            case GREATER_OR_EQUAL:
                return compareNumbers(fieldValue, expectedValue) >= 0;
            case LESS_THAN:
                return compareNumbers(fieldValue, expectedValue) < 0;
            case LESS_OR_EQUAL:
                return compareNumbers(fieldValue, expectedValue) <= 0;
            case BETWEEN:
                return isBetween(fieldValue, expectedValue);
            case NOT_BETWEEN:
                return !isBetween(fieldValue, expectedValue);

            // Collection operations
            case IN:
                return isIn(fieldValue, expectedValue);
            case NOT_IN:
                return !isIn(fieldValue, expectedValue);
            case ARRAY_CONTAINS:
                return arrayContains(fieldValue, expectedValue);
            case ARRAY_SIZE_EQUALS:
                return getCollectionSize(fieldValue) == toInt(expectedValue);
            case ARRAY_SIZE_GREATER_THAN:
                return getCollectionSize(fieldValue) > toInt(expectedValue);
            case ARRAY_SIZE_LESS_THAN:
                return getCollectionSize(fieldValue) < toInt(expectedValue);

            default:
                log.warn("Unsupported operator: {}", operator);
                return false;
        }
    }

    // ==================== Helper methods ====================

    private boolean isEmpty(Object value) {
        if (value == null) {
            return true;
        }
        if (value instanceof String) {
            return ((String) value).isEmpty();
        }
        if (value instanceof Collection) {
            return ((Collection<?>) value).isEmpty();
        }
        if (value instanceof Map) {
            return ((Map<?, ?>) value).isEmpty();
        }
        return false;
    }

    private boolean isEquals(Object a, Object b) {
        if (a == null && b == null) {
            return true;
        }
        if (a == null || b == null) {
            return false;
        }
        // Try numeric comparison for mixed types
        if (isNumeric(a) && isNumeric(b)) {
            return compareNumbers(a, b) == 0;
        }
        return a.equals(b) || String.valueOf(a).equals(String.valueOf(b));
    }

    private boolean stringContains(Object fieldValue, Object expectedValue) {
        if (fieldValue == null || expectedValue == null) {
            return false;
        }
        return String.valueOf(fieldValue).contains(String.valueOf(expectedValue));
    }

    private boolean stringStartsWith(Object fieldValue, Object expectedValue) {
        if (fieldValue == null || expectedValue == null) {
            return false;
        }
        return String.valueOf(fieldValue).startsWith(String.valueOf(expectedValue));
    }

    private boolean stringEndsWith(Object fieldValue, Object expectedValue) {
        if (fieldValue == null || expectedValue == null) {
            return false;
        }
        return String.valueOf(fieldValue).endsWith(String.valueOf(expectedValue));
    }

    private boolean matchesRegex(Object fieldValue, Object pattern) {
        if (fieldValue == null || pattern == null) {
            return false;
        }
        String patternStr = String.valueOf(pattern);
        Pattern compiledPattern = regexCache.computeIfAbsent(patternStr, Pattern::compile);
        return compiledPattern.matcher(String.valueOf(fieldValue)).matches();
    }

    private int compareNumbers(Object a, Object b) {
        BigDecimal numA = toBigDecimal(a);
        BigDecimal numB = toBigDecimal(b);
        if (numA == null || numB == null) {
            return 0;
        }
        return numA.compareTo(numB);
    }

    @SuppressWarnings("unchecked")
    private boolean isBetween(Object fieldValue, Object range) {
        if (!(range instanceof List) || ((List<?>) range).size() != 2) {
            log.warn("BETWEEN operator requires a list with [min, max], got: {}", range);
            return false;
        }
        List<Object> rangeList = (List<Object>) range;
        int compareMin = compareNumbers(fieldValue, rangeList.get(0));
        int compareMax = compareNumbers(fieldValue, rangeList.get(1));
        return compareMin >= 0 && compareMax <= 0;
    }

    @SuppressWarnings("unchecked")
    private boolean isIn(Object fieldValue, Object collection) {
        if (collection instanceof Collection) {
            return ((Collection<Object>) collection).stream()
                    .anyMatch(item -> isEquals(fieldValue, item));
        }
        return isEquals(fieldValue, collection);
    }

    @SuppressWarnings("unchecked")
    private boolean arrayContains(Object array, Object value) {
        if (array instanceof Collection) {
            return ((Collection<Object>) array).stream()
                    .anyMatch(item -> isEquals(item, value));
        }
        return false;
    }

    private int getCollectionSize(Object value) {
        if (value instanceof Collection) {
            return ((Collection<?>) value).size();
        }
        if (value instanceof Map) {
            return ((Map<?, ?>) value).size();
        }
        return 0;
    }

    private boolean isNumeric(Object value) {
        return value instanceof Number ||
                (value instanceof String && ((String) value).matches("-?\\d+(\\.\\d+)?"));
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof BigDecimal) {
            return (BigDecimal) value;
        }
        if (value instanceof Number) {
            return BigDecimal.valueOf(((Number) value).doubleValue());
        }
        try {
            return new BigDecimal(String.valueOf(value));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private int toInt(Object value) {
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private Boolean toBoolean(Object value) {
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        if (value instanceof String) {
            return Boolean.parseBoolean((String) value);
        }
        if (value instanceof Number) {
            return ((Number) value).intValue() != 0;
        }
        return null;
    }
}
