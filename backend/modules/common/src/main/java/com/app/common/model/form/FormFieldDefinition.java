package com.app.common.model.form;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class FormFieldDefinition {
    private String key;
    private FormFieldType type;
    private String label;
    private String description;
    private boolean required;
    private String placeholder;
    private String defaultValue;
    /** SpEL or simple expression — field visible when true */
    private String visibleWhen;
    private String requiredWhen;
    private Integer minLength;
    private Integer maxLength;
    private Double min;
    private Double max;
    private String pattern;
    private List<String> options;
    private boolean pii;
    private FormFieldLayout layout;
    private Map<String, Object> metadata;
}
