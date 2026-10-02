package com.app.api.dto;

import com.app.common.model.trigger.McpExposureMode;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class McpSettingsResponse {
    private boolean enabled;
    private McpExposureMode exposureMode;
    private String globalEndpointPath;
    private String globalEndpointUrl;
    private String authTokenMasked;
    private boolean hasAuthToken;
    private boolean allowStdioTransport;
}
