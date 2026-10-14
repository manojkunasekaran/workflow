package com.app.api.service.auth;

import com.app.api.config.AuthProperties;
import com.app.common.exception.ValidationException;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;

/**
 * OAuth 2.0 / OpenID sign-in (provider credentials from configuration).
 */
@Service
@RequiredArgsConstructor
public class OAuthSignInService {

    private static final String AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

    private final AuthProperties authProperties;
    private final Environment environment;
    private final RestTemplate restTemplate;

    public String buildAuthorizationRedirect(HttpServletResponse response) {
        if (!authProperties.isOauthSignInAvailable()) {
            throw new ValidationException("Account sign-in is not available.");
        }
        String state = UUID.randomUUID().toString();
        writeOauthStateCookie(response, state);

        String redirectUri = getCallbackUrl();
        return UriComponentsBuilder.fromUriString(AUTHORIZATION_URL)
                .queryParam("client_id", authProperties.getOauth().getClientId())
                .queryParam("redirect_uri", redirectUri)
                .queryParam("response_type", "code")
                .queryParam("scope", urlEncode("openid email profile"))
                .queryParam("state", state)
                .queryParam("access_type", "online")
                .queryParam("prompt", "select_account")
                .build(true)
                .toUriString();
    }

    public OAuthUserProfile exchangeCodeAndFetchProfile(
            String code, String state, HttpServletRequest request, HttpServletResponse response) {
        validateState(state, request, response);

        String redirectUri = getCallbackUrl();
        Map<String, String> tokenBody = Map.of(
                "code", code,
                "client_id", authProperties.getOauth().getClientId(),
                "client_secret", authProperties.getOauth().getClientSecret(),
                "redirect_uri", redirectUri,
                "grant_type", "authorization_code");

        @SuppressWarnings("unchecked")
        ResponseEntity<Map> tokenResponse = restTemplate.exchange(
                TOKEN_URL, HttpMethod.POST, com.app.api.oauth.OAuthHttpForm.postEntity(tokenBody), Map.class);
        Map<String, Object> tokenMap = tokenResponse.getBody();
        if (tokenMap == null || tokenMap.get("access_token") == null) {
            throw new ValidationException("Sign-in could not be completed. Please try again.");
        }
        String accessToken = String.valueOf(tokenMap.get("access_token"));

        ResponseEntity<OAuthUserProfile> userResponse = restTemplate.exchange(
                USERINFO_URL + "?access_token=" + urlEncode(accessToken),
                HttpMethod.GET,
                null,
                OAuthUserProfile.class);
        OAuthUserProfile profile = userResponse.getBody();
        if (profile == null || profile.getSub() == null || profile.getSub().isBlank()) {
            throw new ValidationException("Sign-in could not be completed. Please try again.");
        }
        return profile;
    }

    public String getCallbackUrl() {
        return environment.getProperty("workflow.api.base-url", "http://localhost:8080")
                + "/rest/auth/callback";
    }

    public String getFrontendBaseUrl() {
        return environment.getProperty("workflow.frontend.base-url", "http://localhost:5173");
    }

    private void validateState(String state, HttpServletRequest request, HttpServletResponse response) {
        String expected = readOauthStateCookie(request).orElse(null);
        clearOauthStateCookie(response);
        if (expected == null || state == null || !expected.equals(state)) {
            throw new ValidationException("Sign-in session expired. Please try again.");
        }
    }

    private void writeOauthStateCookie(HttpServletResponse response, String state) {
        Cookie cookie = new Cookie(authProperties.getOauthStateCookieName(), state);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(600);
        response.addCookie(cookie);
    }

    private void clearOauthStateCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(authProperties.getOauthStateCookieName(), "");
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }

    private java.util.Optional<String> readOauthStateCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return java.util.Optional.empty();
        }
        return Arrays.stream(cookies)
                .filter(c -> authProperties.getOauthStateCookieName().equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst();
    }

    private static String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class OAuthUserProfile {
        private String sub;
        private String email;
        private String name;

        @JsonProperty("picture")
        private String pictureUrl;
    }
}
