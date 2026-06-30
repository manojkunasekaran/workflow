package com.app.common.model.rule;

/**
 * Comparison operators for rule conditions.
 * Operators are designed to be type-agnostic - the RuleEvaluator
 * handles type detection and coercion at runtime.
 */
public enum Operator {
    // Universal operators (work with any type)
    EQUALS,
    NOT_EQUALS,
    IS_NULL,
    IS_NOT_NULL,

    // String operators
    CONTAINS,
    NOT_CONTAINS,
    STARTS_WITH,
    ENDS_WITH,
    IS_EMPTY,
    IS_NOT_EMPTY,
    MATCHES_REGEX,

    // Numeric/Date comparison operators
    GREATER_THAN,
    GREATER_OR_EQUAL,
    LESS_THAN,
    LESS_OR_EQUAL,
    BETWEEN,
    NOT_BETWEEN,

    // Boolean operators
    IS_TRUE,
    IS_FALSE,

    // Array/Collection operators
    IN,
    NOT_IN,
    ARRAY_CONTAINS,
    ARRAY_SIZE_EQUALS,
    ARRAY_SIZE_GREATER_THAN,
    ARRAY_SIZE_LESS_THAN
}
