package com.app.api.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class McpToolCallResponse {
    private String executionId;
    private Object result;
    private String responseMode;
}
