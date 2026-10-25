package com.app.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class OAuthAuthorizeResponse {
    private String authorizationUrl;
}
