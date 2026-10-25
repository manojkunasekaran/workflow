package com.app.common.model.form;

import com.app.common.exception.ValidationException;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/** Server-side validation for submitted form answers against a page schema. */
public final class FormAnswerValidator {

    private FormAnswerValidator() {}

    public static void validatePage(FormPageDefinition page, Map<String, Object> answers) {
        if (page == null || page.getFields() == null) {
            return;
        }
        if (answers == null) {
            answers = Map.of();
        }
        Set<String> seen = new HashSet<>();
        for (FormFieldDefinition field : page.getFields()) {
            if (field.getType() == FormFieldType.SECTION_HEADER) {
                continue;
            }
            if (!isFieldVisible(field, answers)) {
                continue;
            }
            if (field.getType() == FormFieldType.FILE) {
                throw new ValidationException("File upload fields are not supported yet");
            }
            String key = field.getKey();
            if (key == null || key.isBlank()) {
                throw new ValidationException("Form field key is required");
            }
            if (!seen.add(key)) {
                throw new ValidationException("Duplicate form field key: " + key);
            }
            Object value = answers.get(key);
            if (field.isRequired() && (value == null || String.valueOf(value).isBlank())) {
                throw new ValidationException("Field '" + key + "' is required");
            }
            if (value instanceof String s && field.getMaxLength() != null && s.length() > field.getMaxLength()) {
                throw new ValidationException("Field '" + key + "' exceeds max length");
            }
        }
    }

    static boolean isFieldVisible(FormFieldDefinition field, Map<String, Object> answers) {
        String expr = field.getVisibleWhen();
        if (expr == null || expr.isBlank()) {
            return true;
        }
        String trimmed = expr.trim();
        var stringMatch = java.util.regex.Pattern
                .compile("^([a-zA-Z0-9_]+)\\s*==\\s*'([^']*)'$")
                .matcher(trimmed);
        if (stringMatch.matches()) {
            String key = stringMatch.group(1);
            String expected = stringMatch.group(2);
            Object actual = answers.get(key);
            return expected.equals(actual != null ? String.valueOf(actual) : "");
        }
        var boolMatch = java.util.regex.Pattern
                .compile("^([a-zA-Z0-9_]+)\\s*==\\s*(true|false)$", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(trimmed);
        if (boolMatch.matches()) {
            String key = boolMatch.group(1);
            boolean expected = Boolean.parseBoolean(boolMatch.group(2));
            Object actual = answers.get(key);
            return Boolean.TRUE.equals(actual) == expected || (actual instanceof Boolean b && b == expected);
        }
        return true;
    }
}
