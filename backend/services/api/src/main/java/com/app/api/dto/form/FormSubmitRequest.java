package com.app.api.dto.form;

import lombok.Data;

import java.util.Map;

@Data
public class FormSubmitRequest {
    private Map<String, Object> answers;
    private String sessionToken;
}
