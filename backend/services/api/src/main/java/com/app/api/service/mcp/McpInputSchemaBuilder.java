package com.app.api.service.mcp;

import com.app.common.entity.WorkflowDefinition;
import com.app.common.model.variable.VariableType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class McpInputSchemaBuilder {

    public Map<String, Object> buildSchema(List<WorkflowDefinition.WorkflowInput> inputs) {
        Map<String, Object> properties = new LinkedHashMap<>();
        List<String> required = new ArrayList<>();

        if (inputs != null) {
            for (WorkflowDefinition.WorkflowInput input : inputs) {
                if (input.getName() == null || input.getName().isBlank()) {
                    continue;
                }
                Map<String, Object> property = new LinkedHashMap<>();
                VariableType type = input.getType() != null ? input.getType() : VariableType.STRING;
                property.put("type", type.getValue());
                if (input.getDescription() != null && !input.getDescription().isBlank()) {
                    property.put("description", input.getDescription());
                }
                if (input.getDefaultValue() != null) {
                    property.put("default", input.getDefaultValue());
                }
                properties.put(input.getName(), property);
                if (input.isRequired()) {
                    required.add(input.getName());
                }
            }
        }

        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("properties", properties);
        if (!required.isEmpty()) {
            schema.put("required", required);
        }
        return schema;
    }
}
