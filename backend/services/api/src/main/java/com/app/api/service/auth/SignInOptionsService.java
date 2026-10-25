package com.app.api.service.auth;

import com.app.api.config.AuthProperties;
import com.app.api.dto.AuthSignInOptionsResponse;
import com.app.common.auth.AuthMode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SignInOptionsService {

    private final AuthProperties authProperties;

    public AuthSignInOptionsResponse getOptions() {
        AuthMode mode = authProperties.getMode();
        boolean oauth = authProperties.isOauthSignInAvailable();
        boolean demo = authProperties.isDemoSignInAvailable();

        return AuthSignInOptionsResponse.builder()
                .mode(mode)
                .signInRequired(authProperties.isSignInRequired())
                .demoAdminSignInAvailable(demo)
                .demoAdminSignInLabel(demo ? "Log in as Platform Admin" : null)
                .demoOrgAdminSignInAvailable(demo)
                .demoOrgAdminSignInLabel(demo ? "Log in as Org Admin" : null)
                .demoUserSignInAvailable(demo)
                .demoUserSignInLabel(demo ? "Log in as Org User" : null)
                .oauthSignInAvailable(oauth)
                .oauthSignInLabel(oauth ? "Continue with Google" : null)
                .build();
    }
}
