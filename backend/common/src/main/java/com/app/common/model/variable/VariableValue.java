package com.app.common.model.variable;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a runtime variable/input value with its type.
 * Used for both trigger inputs and workflow variables at execution time.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VariableValue {

    /** Variable name */
    private String name;

    /** Variable type */
    private VariableType type;

    /** Actual runtime value */
    private Object value;

    /**
     * Convenience factory for string values.
     */
    public static VariableValue ofString(String name, String value) {
        return VariableValue.builder()
                .name(name)
                .type(VariableType.STRING)
                .value(value)
                .build();
    }

    /**
     * Convenience factory for number values.
     */
    public static VariableValue ofNumber(String name, Number value) {
        return VariableValue.builder()
                .name(name)
                .type(VariableType.NUMBER)
                .value(value)
                .build();
    }

    /**
     * Convenience factory for boolean values.
     */
    public static VariableValue ofBoolean(String name, Boolean value) {
        return VariableValue.builder()
                .name(name)
                .type(VariableType.BOOLEAN)
                .value(value)
                .build();
    }

    /**
     * Convenience factory for object values.
     */
    public static VariableValue ofObject(String name, Object value) {
        return VariableValue.builder()
                .name(name)
                .type(VariableType.OBJECT)
                .value(value)
                .build();
    }
}
