package com.app.common.connector;

import lombok.Data;
import java.util.List;

@Data
public class ConnectorInputField {
    private String key;
    private String label;
    private String description;
    private ConnectorFieldType type;
    private boolean required;
    private Object defaultValue;
    private List<FieldOption> options;
    private String placeholder;
    private boolean supportsExpression;
}
