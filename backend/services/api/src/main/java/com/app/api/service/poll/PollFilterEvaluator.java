package com.app.api.service.poll;

import com.app.common.model.trigger.PollFilter;
import com.app.common.util.DataTransformUtils;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Evaluates item-level filters after poll response parsing.
 */
@Component
public class PollFilterEvaluator {

    public boolean passesAll(Map<String, Object> item, List<PollFilter> filters) {
        if (filters == null || filters.isEmpty()) {
            return true;
        }
        for (PollFilter filter : filters) {
            if (!evaluate(item, filter)) {
                return false;
            }
        }
        return true;
    }

    private boolean evaluate(Map<String, Object> item, PollFilter filter) {
        if (filter == null || filter.getField() == null) {
            return true;
        }

        Object fieldValue = resolveField(item, filter.getField());
        String operator = filter.getOperator() != null ? filter.getOperator().toUpperCase() : "EQ";
        Object expected = filter.getValue();

        return switch (operator) {
            case "EQ", "EQUALS" -> Objects.equals(normalize(fieldValue), normalize(expected));
            case "NE", "NOT_EQUALS" -> !Objects.equals(normalize(fieldValue), normalize(expected));
            case "GT" -> compare(fieldValue, expected) > 0;
            case "GTE", "GE" -> compare(fieldValue, expected) >= 0;
            case "LT" -> compare(fieldValue, expected) < 0;
            case "LTE", "LE" -> compare(fieldValue, expected) <= 0;
            case "CONTAINS" -> fieldValue != null && expected != null
                    && fieldValue.toString().contains(expected.toString());
            default -> true;
        };
    }

    private Object resolveField(Map<String, Object> item, String field) {
        if (field.startsWith("$")) {
            return DataTransformUtils.extractJsonPath(item, field);
        }
        return item.get(field);
    }

    private Object normalize(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return value;
    }

    private int compare(Object actual, Object expected) {
        if (actual == null || expected == null) {
            return -1;
        }
        if (actual instanceof Number && expected instanceof Number) {
            return Double.compare(((Number) actual).doubleValue(), ((Number) expected).doubleValue());
        }
        return actual.toString().compareTo(expected.toString());
    }
}
