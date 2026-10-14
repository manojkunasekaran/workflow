package com.app.api.dto;

import com.app.common.auth.AuthMode;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AuthMeResponse {
    private String userId;
    private String email;
    private String displayName;
    private String pictureUrl;
    private boolean platformAdmin;
    private boolean signInRequired;
    private AuthMode authMode;
    private String activeOrganizationId;
    private List<AuthOrganizationSummary> organizations;
}
