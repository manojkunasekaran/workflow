package com.app.api.dto;

import lombok.Data;

@Data
public class ConnectorOAuthPlatformConfigDto {
    private String connectorId;
    private String clientId;
    /** Plain text on write; {@code ********} means unchanged on update. Omitted in list responses when not configured. */
    private String clientSecret;
    private boolean enabled;
    private boolean configured;
}
