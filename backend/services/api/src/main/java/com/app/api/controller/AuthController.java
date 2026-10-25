package com.app.api.controller;

import com.app.api.config.AuthProperties;
import com.app.api.context.AuthContext;
import com.app.api.dto.AuthMeResponse;
import com.app.api.dto.AuthSignInOptionsResponse;
import com.app.api.dto.DemoSignInRequest;
import com.app.api.dto.SwitchOrganizationRequest;
import com.app.api.service.auth.AuthSessionService;
import com.app.api.service.auth.DemoSignInService;
import com.app.api.service.auth.OAuthSignInService;
import com.app.api.service.auth.SignInOptionsService;
import com.app.api.service.auth.UserAuthService;
import com.app.common.entity.AuthSession;
import com.app.common.entity.UserAccount;
import com.app.common.exception.ValidationException;
import com.app.persistence.repository.OrganizationMembershipRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.view.RedirectView;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthProperties authProperties;
    private final OAuthSignInService oauthSignInService;
    private final DemoSignInService demoSignInService;
    private final SignInOptionsService signInOptionsService;
    private final UserAuthService userAuthService;
    private final AuthSessionService authSessionService;
    private final OrganizationMembershipRepository membershipRepository;
    private final com.app.persistence.repository.WorkflowDefinitionRepository workflowDefinitionRepository;
    private final Environment environment;

    @GetMapping("/sign-in-options")
    public AuthSignInOptionsResponse signInOptions() {
        return signInOptionsService.getOptions();
    }

    @PostMapping("/demo/sign-in")
    public AuthMeResponse demoSignIn(@RequestBody(required = false) DemoSignInRequest body, HttpServletResponse response) {
        String role = (body != null && body.getRole() != null) ? body.getRole() : "admin";
        UserAccount user = resolveDemoUser(role);
        String activeOrgId = resolveInitialOrganizationId(user);
        AuthSession session = authSessionService.createSession(user, activeOrgId);
        authSessionService.writeSessionCookie(response, session.getId());
        return userAuthService.buildMeResponse(user, session);
    }

    /** OAuth sign-in — only when {@link AuthMode#OAUTH} is enabled and configured. */
    @GetMapping("/sign-in")
    public RedirectView oauthSignIn(HttpServletResponse response) {
        requireOauthMode();
        String url = oauthSignInService.buildAuthorizationRedirect(response);
        return new RedirectView(url);
    }

    /** OAuth callback — only when {@link AuthMode#OAUTH} is enabled. */
    @GetMapping("/callback")
    public RedirectView oauthCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            HttpServletRequest request,
            HttpServletResponse response) {
        requireOauthMode();
        if (code == null || code.isBlank()) {
            return errorRedirect("Sign-in was cancelled.");
        }
        OAuthSignInService.OAuthUserProfile profile =
                oauthSignInService.exchangeCodeAndFetchProfile(code, state, request, response);
        UserAccount user = userAuthService.upsertOAuthUser(
                profile.getSub(),
                profile.getEmail(),
                profile.getName(),
                profile.getPictureUrl());

        return completeSignIn(response, user);
    }

    @GetMapping("/me")
    public AuthMeResponse me(HttpServletRequest request) {
        ObjectId sessionId = authSessionService
                .readSessionIdFromCookie(request)
                .orElseThrow(() -> new com.app.common.exception.UnauthorizedException("Not signed in."));
        AuthSession session = authSessionService.requireValidSession(sessionId);
        UserAccount user = userAuthService.requireUser(session.getUserId());
        AuthContext.set(user.getId(), session.getId(), user.isPlatformAdmin());
        try {
            return userAuthService.buildMeResponse(user, session);
        } finally {
            AuthContext.clear();
        }
    }

    @PostMapping("/logout")
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        authSessionService.readSessionIdFromCookie(request).ifPresent(authSessionService::revokeSession);
        authSessionService.clearSessionCookie(response);
    }

    @PostMapping("/session/organization")
    public AuthMeResponse switchOrganization(
            @RequestBody SwitchOrganizationRequest body,
            HttpServletRequest request,
            HttpServletResponse response) {
        if (body.getOrganizationId() == null || body.getOrganizationId().isBlank()) {
            throw new ValidationException("organizationId is required.");
        }
        ObjectId sessionId = authSessionService
                .readSessionIdFromCookie(request)
                .orElseThrow(() -> new com.app.common.exception.UnauthorizedException("Not signed in."));
        AuthSession session = authSessionService.requireValidSession(sessionId);
        UserAccount user = userAuthService.requireUser(session.getUserId());
        session = authSessionService.switchActiveOrganization(
                session, user, body.getOrganizationId().trim(), user.isPlatformAdmin());
        authSessionService.writeSessionCookie(response, session.getId());
        return userAuthService.buildMeResponse(user, session);
    }

    private UserAccount resolveDemoUser(String role) {
        if (role == null || role.isBlank()) {
            throw new ValidationException("role is required (admin, org-admin, or user).");
        }
        String normalized = role.trim().toLowerCase(Locale.ROOT);
        if ("admin".equals(normalized) || "platform-admin".equals(normalized)) {
            return demoSignInService.signInAsAdmin();
        }
        if ("org-admin".equals(normalized) || "orgadmin".equals(normalized)) {
            return demoSignInService.signInAsOrgAdmin();
        }
        if ("user".equals(normalized) || "member".equals(normalized)) {
            return demoSignInService.signInAsUser();
        }
        throw new ValidationException("role must be admin, org-admin, or user.");
    }

    private void requireOauthMode() {
        if (!authProperties.isOauthSignInAvailable()) {
            throw new ValidationException("OAuth sign-in is not enabled.");
        }
    }

    private RedirectView completeSignIn(HttpServletResponse response, UserAccount user) {
        String activeOrgId = resolveInitialOrganizationId(user);
        AuthSession session = authSessionService.createSession(user, activeOrgId);
        authSessionService.writeSessionCookie(response, session.getId());
        return new RedirectView(getFrontendBaseUrl() + "/");
    }

    private String resolveInitialOrganizationId(UserAccount user) {
        if (user.isPlatformAdmin()) {
            return "platform-admin-org";
        }
        List<com.app.common.entity.OrganizationMembership> memberships = membershipRepository.findByUserId(user.getId());
        for (com.app.common.entity.OrganizationMembership m : memberships) {
            if ("demo-org".equals(m.getOrganizationId())) {
                return m.getOrganizationId();
            }
        }
        for (com.app.common.entity.OrganizationMembership m : memberships) {
            if ("platform-admin-org".equals(m.getOrganizationId())) {
                return m.getOrganizationId();
            }
        }
        return memberships.stream()
                .map(com.app.common.entity.OrganizationMembership::getOrganizationId)
                .findFirst()
                .orElseThrow(() -> new ValidationException("No organization available for this user."));
    }

    private RedirectView errorRedirect(String message) {
        return new RedirectView(getFrontendBaseUrl()
                + "/login?error="
                + URLEncoder.encode(message, StandardCharsets.UTF_8));
    }

    private String getFrontendBaseUrl() {
        return environment.getProperty("workflow.frontend.base-url", "http://localhost:5173");
    }
}
