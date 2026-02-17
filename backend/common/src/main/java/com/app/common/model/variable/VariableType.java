package com.app.common.model.variable;

/**
 * Supported variable/input types for workflow definitions and execution
 * context.
 * Used in WorkflowDefinition.WorkflowInput and for type validation.
 */
public enum VariableType {
    STRING("string"),
    NUMBER("number"),
    BOOLEAN("boolean"),
    OBJECT("object"),
    ARRAY("array");

    private final String value;

    VariableType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /**
     * Parse from string value (case-insensitive).
     */
    public static VariableType fromValue(String value) {
        if (value == null) {
            return STRING; // default
        }
        for (VariableType type : values()) {
            if (type.value.equalsIgnoreCase(value)) {
                return type;
            }
        }
        return STRING;
    }
}
