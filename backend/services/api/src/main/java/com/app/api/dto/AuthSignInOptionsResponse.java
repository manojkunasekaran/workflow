package com.app.api.dto;

import com.app.common.auth.AuthMode;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthSignInOptionsResponse {
    private AuthMode mode;
    private boolean signInRequired;
    private boolean demoAdminSignInAvailable;
    private String demoAdminSignInLabel;
    private boolean demoOrgAdminSignInAvailable;
    private String demoOrgAdminSignInLabel;
    private boolean demoUserSignInAvailable;
    private String demoUserSignInLabel;
    private boolean oauthSignInAvailable;
    private String oauthSignInLabel;
}
