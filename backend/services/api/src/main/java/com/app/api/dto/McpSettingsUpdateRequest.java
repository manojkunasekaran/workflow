package com.app.api.dto;

import com.app.common.model.trigger.McpExposureMode;
import lombok.Data;

@Data
public class McpSettingsUpdateRequest {
    private Boolean enabled;
    private McpExposureMode exposureMode;
    private String globalEndpointPath;
    private Boolean allowStdioTransport;
}
