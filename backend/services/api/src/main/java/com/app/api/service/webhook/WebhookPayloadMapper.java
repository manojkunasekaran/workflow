package com.app.api.service.webhook;

import com.app.common.model.variable.VariableType;
import com.app.common.model.variable.VariableValue;
import com.app.common.util.DataTransformUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Maps inbound webhook JSON bodies to workflow trigger inputs.
 */
@Component
@RequiredArgsConstructor
public class WebhookPayloadMapper {

    private final ObjectMapper objectMapper;

    public Map<String, VariableValue> mapPayload(Object parsedBody, String payloadPath) {
        Object source = parsedBody;
        if (payloadPath != null && !payloadPath.isBlank()) {
            source = DataTransformUtils.extractJsonPath(parsedBody, payloadPath);
        }

        if (!(source instanceof Map<?, ?> map) || map.isEmpty()) {
            return new HashMap<>();
        }

        Map<String, VariableValue> inputs = new HashMap<>();
        for (Map.Entry<?, ?> entry : map.entrySet()) {
            if (entry.getKey() == null) {
                continue;
            }
            String key = entry.getKey().toString();
            Object value = entry.getValue();
            inputs.put(key, VariableValue.builder()
                    .name(key)
                    .type(resolveType(value))
                    .value(value)
                    .build());
        }
        return inputs;
    }

    public Object parseBody(byte[] rawBody) {
        if (rawBody == null || rawBody.length == 0) {
            return new HashMap<String, Object>();
        }
        try {
            return objectMapper.readValue(rawBody, Object.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("Request body must be valid JSON");
        }
    }

    private VariableType resolveType(Object value) {
        if (value instanceof String) {
            return VariableType.STRING;
        }
        if (value instanceof Number) {
            return VariableType.NUMBER;
        }
        if (value instanceof Boolean) {
            return VariableType.BOOLEAN;
        }
        return VariableType.OBJECT;
    }
}
