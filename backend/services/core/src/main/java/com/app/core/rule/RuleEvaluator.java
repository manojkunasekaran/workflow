package com.app.core.rule;

import com.app.common.model.task.parameters.ConditionalTaskParameters.Branch;
import com.app.common.model.rule.ConditionEvaluation;
import com.app.common.model.rule.ConditionEvaluationKind;
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
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service for evaluating rule conditions against an execution context.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RuleEvaluator {

    private final VariableResolver variableResolver;
    private final ExpressionParser spelParser = new SpelExpressionParser();

    private final Map<String, Expression> expressionCache = new ConcurrentHashMap<>();
    private final Map<String, Pattern> regexCache = new ConcurrentHashMap<>();

    private static final Pattern STRING_COMPARISON_PATTERN = Pattern
            .compile("^([^'\"\\s=<>!]+)\\s*(==|!=)\\s*'([^']*)'\\s*$");
    private static final Pattern BOOLEAN_COMPARISON_PATTERN = Pattern
            .compile("^([^'\"\\s=<>!]+)\\s*(==|!=)\\s*(true|false)\\s*$", Pattern.CASE_INSENSITIVE);

    public EvaluationResult evaluate(Branch branch, ExecutionContext context) {
        if (branch == null) {
            return EvaluationResult.notMatched(List.of());
        }

        EvaluationResult result;
        if (branch.getRules() != null && !branch.getRules().isEmpty()) {
            result = evaluateRuleGroup(branch.getRules(), context);
        } else if (branch.getExpression() != null && !branch.getExpression().isBlank()) {
            result = evaluateExpression(branch.getExpression(), context);
        } else {
            log.warn("Branch '{}' has no rules or expression defined, defaulting to true",
                    branch.getName());
            result = EvaluationResult.matched(List.of());
        }

        return result.withBranchName(branch.getName());
    }

    public EvaluationResult evaluateRuleGroup(RuleGroup group, ExecutionContext context) {
        if (group == null || group.isEmpty()) {
            return EvaluationResult.matched(List.of());
        }

        LogicalOperator operator = group.getOperator() != null
                ? group.getOperator()
                : LogicalOperator.AND;

        boolean hasConditions = group.getConditions() != null && !group.getConditions().isEmpty();
        boolean hasNestedGroups = group.getNestedGroups() != null && !group.getNestedGroups().isEmpty();

        List<ConditionEvaluation> trace = new ArrayList<>();

        if (operator == LogicalOperator.AND) {
            if (hasConditions) {
                for (RuleCondition condition : group.getConditions()) {
                    EvaluationResult res = evaluateCondition(condition, context);
                    trace = EvaluationResult.merge(trace, res.evaluations());
                    if (!res.matched()) {
                        return EvaluationResult.notMatched(trace);
                    }
                }
            }
            if (hasNestedGroups) {
                for (RuleGroup nested : group.getNestedGroups()) {
                    EvaluationResult res = evaluateRuleGroup(nested, context);
                    trace = EvaluationResult.merge(trace, res.evaluations());
                    if (!res.matched()) {
                        return EvaluationResult.notMatched(trace);
                    }
                }
            }
            return EvaluationResult.matched(trace);
        }

        if (hasConditions) {
            for (RuleCondition condition : group.getConditions()) {
                EvaluationResult res = evaluateCondition(condition, context);
                trace = EvaluationResult.merge(trace, res.evaluations());
                if (res.matched()) {
                    return EvaluationResult.matched(trace);
                }
            }
        }
        if (hasNestedGroups) {
            for (RuleGroup nested : group.getNestedGroups()) {
                EvaluationResult res = evaluateRuleGroup(nested, context);
                trace = EvaluationResult.merge(trace, res.evaluations());
                if (res.matched()) {
                    return EvaluationResult.matched(trace);
                }
            }
        }
        return EvaluationResult.of(!hasConditions && !hasNestedGroups, trace);
    }

    public EvaluationResult evaluateCondition(RuleCondition condition, ExecutionContext context) {
        if (condition == null) {
            return EvaluationResult.matched(List.of());
        }

        Object fieldValue = variableResolver.resolveValue(condition.getField(), context);
        Object expectedValue = variableResolver.resolveValue(condition.getValue(), context);
        Operator operator = condition.getOperator();

        boolean result = evaluateOperator(fieldValue, operator, expectedValue);
        if (condition.isNegated()) {
            result = !result;
        }

        log.debug("Condition: {} ({}) {} {} = {} (negated: {})",
                condition.getField(), fieldValue, operator, expectedValue, result, condition.isNegated());

        ConditionEvaluation evaluation = ConditionEvaluation.builder()
                .kind(ConditionEvaluationKind.RULE)
                .source(String.valueOf(condition.getField()))
                .actual(fieldValue)
                .expected(expectedValue)
                .operator(operator != null ? operator.name() : null)
                .negated(condition.isNegated())
                .matched(result)
                .build();

        return EvaluationResult.of(result, List.of(evaluation));
    }

    public EvaluationResult evaluateExpression(String expressionStr, ExecutionContext context) {
        if (expressionStr == null || expressionStr.isBlank()) {
            return EvaluationResult.matched(List.of());
        }

        String original = expressionStr.trim();

        try {
            String evaluable = original.contains("{{")
                    ? variableResolver.resolveString(original, context).trim()
                    : original;

            boolean matched = resolveToBoolean(evaluable, context);
            ConditionEvaluation evaluation = ConditionEvaluation.builder()
                    .kind(ConditionEvaluationKind.EXPRESSION)
                    .source(original)
                    .resolved(evaluable)
                    .matched(matched)
                    .build();

            return EvaluationResult.of(matched, List.of(evaluation));
        } catch (Exception e) {
            log.error("Failed to evaluate expression: {}", original, e);
            ConditionEvaluation evaluation = ConditionEvaluation.builder()
                    .kind(ConditionEvaluationKind.EXPRESSION)
                    .source(original)
                    .matched(false)
                    .error(e.getMessage())
                    .build();
            return EvaluationResult.notMatched(List.of(evaluation));
        }
    }

    private boolean resolveToBoolean(String resolved, ExecutionContext context) {
        if (resolved.isEmpty()) {
            return false;
        }
        if ("true".equalsIgnoreCase(resolved)) {
            return true;
        }
        if ("false".equalsIgnoreCase(resolved)) {
            return false;
        }
        return evaluateSpel(prepareSpelExpression(resolved), context);
    }

    private String prepareSpelExpression(String expr) {
        String normalized = expr.replace("===", "==").replace("!==", "!=");
        return quoteBareComparisonOperands(normalized);
    }

    private String quoteBareComparisonOperands(String expr) {
        Matcher stringMatch = STRING_COMPARISON_PATTERN.matcher(expr.trim());
        if (stringMatch.matches()) {
            String left = escapeSpelString(stringMatch.group(1).trim());
            String op = stringMatch.group(2);
            String right = escapeSpelString(stringMatch.group(3));
            return "'" + left + "' " + op + " '" + right + "'";
        }

        Matcher boolMatch = BOOLEAN_COMPARISON_PATTERN.matcher(expr.trim());
        if (boolMatch.matches()) {
            String left = escapeSpelString(boolMatch.group(1).trim());
            String op = boolMatch.group(2);
            String right = boolMatch.group(3).toLowerCase();
            return "'" + left + "' " + op + " " + right;
        }

        return expr;
    }

    private String escapeSpelString(String value) {
        return value.replace("'", "''");
    }

    private boolean evaluateSpel(String spelExpr, ExecutionContext context) {
        Expression expression = expressionCache.computeIfAbsent(spelExpr, spelParser::parseExpression);
        SimpleEvaluationContext spelContext = createSpelContext(context);
        Boolean result = expression.getValue(spelContext, Boolean.class);
        return Boolean.TRUE.equals(result);
    }

    private SimpleEvaluationContext createSpelContext(ExecutionContext context) {
        SimpleEvaluationContext spelContext = SimpleEvaluationContext.forReadOnlyDataBinding().build();

        context.getTaskOutputs().forEach(spelContext::setVariable);

        Map<String, Object> simpleVars = new HashMap<>();
        context.getWorkflowVariables().forEach((k, v) -> {
            if (v != null) {
                simpleVars.put(k, v.getValue());
            }
        });
        spelContext.setVariable("variables", simpleVars);

        Map<String, Object> simpleInputs = new HashMap<>();
        context.getTriggerInputs().forEach((k, v) -> {
            if (v != null) {
                simpleInputs.put(k, v.getValue());
            }
        });
        spelContext.setVariable("input", simpleInputs);

        spelContext.setVariable("executionTime", context.getExecutionTime());
        spelContext.setVariable("executionId", context.getWorkflowExecutionId());

        return spelContext;
    }

    @SuppressWarnings("unchecked")
    private boolean evaluateOperator(Object fieldValue, Operator operator, Object expectedValue) {
        if (operator == null) {
            return true;
        }

        return switch (operator) {
            case IS_NULL -> fieldValue == null;
            case IS_NOT_NULL -> fieldValue != null;
            case IS_TRUE -> Boolean.TRUE.equals(toBoolean(fieldValue));
            case IS_FALSE -> Boolean.FALSE.equals(toBoolean(fieldValue));
            case IS_EMPTY -> isEmpty(fieldValue);
            case IS_NOT_EMPTY -> !isEmpty(fieldValue);
            case EQUALS -> isEquals(fieldValue, expectedValue);
            case NOT_EQUALS -> !isEquals(fieldValue, expectedValue);
            case CONTAINS -> stringContains(fieldValue, expectedValue);
            case NOT_CONTAINS -> !stringContains(fieldValue, expectedValue);
            case STARTS_WITH -> stringStartsWith(fieldValue, expectedValue);
            case ENDS_WITH -> stringEndsWith(fieldValue, expectedValue);
            case MATCHES_REGEX -> matchesRegex(fieldValue, expectedValue);
            case GREATER_THAN -> compareNumbers(fieldValue, expectedValue) > 0;
            case GREATER_OR_EQUAL -> compareNumbers(fieldValue, expectedValue) >= 0;
            case LESS_THAN -> compareNumbers(fieldValue, expectedValue) < 0;
            case LESS_OR_EQUAL -> compareNumbers(fieldValue, expectedValue) <= 0;
            case BETWEEN -> isBetween(fieldValue, expectedValue);
            case NOT_BETWEEN -> !isBetween(fieldValue, expectedValue);
            case IN -> isIn(fieldValue, expectedValue);
            case NOT_IN -> !isIn(fieldValue, expectedValue);
            case ARRAY_CONTAINS -> arrayContains(fieldValue, expectedValue);
            case ARRAY_SIZE_EQUALS -> getCollectionSize(fieldValue) == toInt(expectedValue);
            case ARRAY_SIZE_GREATER_THAN -> getCollectionSize(fieldValue) > toInt(expectedValue);
            case ARRAY_SIZE_LESS_THAN -> getCollectionSize(fieldValue) < toInt(expectedValue);
            default -> {
                log.warn("Unsupported operator: {}", operator);
                yield false;
            }
        };
    }

    private boolean isEmpty(Object value) {
        if (value == null) {
            return true;
        }
        if (value instanceof String string) {
            return string.isEmpty();
        }
        if (value instanceof Collection<?> collection) {
            return collection.isEmpty();
        }
        if (value instanceof Map<?, ?> map) {
            return map.isEmpty();
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
        if (!(range instanceof List<?> rangeList) || rangeList.size() != 2) {
            log.warn("BETWEEN operator requires a list with [min, max], got: {}", range);
            return false;
        }
        int compareMin = compareNumbers(fieldValue, rangeList.get(0));
        int compareMax = compareNumbers(fieldValue, rangeList.get(1));
        return compareMin >= 0 && compareMax <= 0;
    }

    @SuppressWarnings("unchecked")
    private boolean isIn(Object fieldValue, Object collection) {
        if (collection instanceof Collection<?> values) {
            return values.stream().anyMatch(item -> isEquals(fieldValue, item));
        }
        return isEquals(fieldValue, collection);
    }

    @SuppressWarnings("unchecked")
    private boolean arrayContains(Object array, Object value) {
        if (array instanceof Collection<?> values) {
            return values.stream().anyMatch(item -> isEquals(item, value));
        }
        return false;
    }

    private int getCollectionSize(Object value) {
        if (value instanceof Collection<?> collection) {
            return collection.size();
        }
        if (value instanceof Map<?, ?> map) {
            return map.size();
        }
        return 0;
    }

    private boolean isNumeric(Object value) {
        return value instanceof Number
                || (value instanceof String string && string.matches("-?\\d+(\\.\\d+)?"));
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        try {
            return new BigDecimal(String.valueOf(value));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private int toInt(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private Boolean toBoolean(Object value) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof String string) {
            return Boolean.parseBoolean(string);
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        return null;
    }
}
