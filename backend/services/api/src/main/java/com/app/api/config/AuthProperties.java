package com.app.api.config;

import com.app.common.auth.AuthMode;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Data
@Component
@ConfigurationProperties(prefix = "workflow.auth")
public class AuthProperties {

    private AuthMode mode = AuthMode.DEMO;

    private String sessionCookieName = "wf360_session";
    private Duration sessionTtl = Duration.ofDays(30);
    private String oauthStateCookieName = "wf360_oauth_state";

    private Oauth oauth = new Oauth();

    private List<String> platformAdminEmails = new ArrayList<>();

    @Data
    public static class Oauth {
        private String clientId = "";
        private String clientSecret = "";
    }

    public boolean isSignInRequired() {
        return true;
    }

    public boolean isOauthSignInAvailable() {
        return mode == AuthMode.OAUTH && oauth.clientId != null && !oauth.clientId.isBlank();
    }

    public boolean isDemoSignInAvailable() {
        return mode == AuthMode.DEMO;
    }
}
