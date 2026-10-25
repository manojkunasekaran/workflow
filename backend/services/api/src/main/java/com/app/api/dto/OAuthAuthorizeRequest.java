package com.app.api.dto;

import lombok.Data;

@Data
public class OAuthAuthorizeRequest {
    private String organizationId;
    private String clientId;
    private String clientSecret;
    private String scopes;
    private String allowedDomains;
}
