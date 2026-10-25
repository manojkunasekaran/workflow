package com.app.common.model.form;

import com.app.common.exception.ValidationException;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class FormAnswerValidatorTest {

    @Test
    void rejectsFileFields() {
        FormPageDefinition page = pageWithField(field("upload", FormFieldType.FILE, true));
        assertThrows(ValidationException.class, () -> FormAnswerValidator.validatePage(page, Map.of()));
    }

    @Test
    void requiresRequiredFields() {
        FormPageDefinition page = pageWithField(field("name", FormFieldType.TEXT, true));
        assertThrows(ValidationException.class, () -> FormAnswerValidator.validatePage(page, Map.of()));
        assertDoesNotThrow(() -> FormAnswerValidator.validatePage(page, Map.of("name", "Ada")));
    }

    @Test
    void enforcesMaxLength() {
        FormFieldDefinition field = field("bio", FormFieldType.TEXT, false);
        field.setMaxLength(3);
        FormPageDefinition page = pageWithField(field);
        assertThrows(
                ValidationException.class,
                () -> FormAnswerValidator.validatePage(page, Map.of("bio", "toolong")));
    }

    @Test
    void rejectsDuplicateKeysInSchema() {
        FormPageDefinition page = new FormPageDefinition();
        page.setFields(List.of(field("dup", FormFieldType.TEXT, false), field("dup", FormFieldType.TEXT, false)));
        assertThrows(ValidationException.class, () -> FormAnswerValidator.validatePage(page, Map.of()));
    }

    private static FormPageDefinition pageWithField(FormFieldDefinition field) {
        FormPageDefinition page = new FormPageDefinition();
        page.setFields(List.of(field));
        return page;
    }

    private static FormFieldDefinition field(String key, FormFieldType type, boolean required) {
        FormFieldDefinition field = new FormFieldDefinition();
        field.setKey(key);
        field.setType(type);
        field.setRequired(required);
        return field;
    }
}
