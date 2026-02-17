package com.app.common.exception;

import java.util.Map;

import lombok.Getter;

@Getter
public class ValidationException extends RuntimeException {

    private final Map<String, String> fieldErrors;

    public ValidationException(String message, Map<String, String> fieldErrors) {
        super(message);
        this.fieldErrors = fieldErrors;
    }

    public ValidationException(String message) {
        super(message);
        this.fieldErrors = Map.of();
    }
}
