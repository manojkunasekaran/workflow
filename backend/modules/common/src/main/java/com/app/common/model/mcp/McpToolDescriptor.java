package com.app.common.model.mcp;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class McpToolDescriptor {
    private String name;
    private String description;
    private Map<String, Object> inputSchema;
}
