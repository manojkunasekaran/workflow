package com.app.api.context;

import com.app.api.service.auth.AuthSessionService;
import com.app.api.service.auth.OrganizationMembershipService;
import com.app.api.service.auth.UserAuthService;
import com.app.common.entity.AuthSession;
import com.app.common.entity.UserAccount;
import com.app.common.exception.AccessDeniedException;
import com.app.common.exception.UnauthorizedException;
import com.app.persistence.repository.OrganizationRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class SessionOrganizationContextFilter extends OncePerRequestFilter {

    private final AuthSessionService authSessionService;
    private final UserAuthService userAuthService;
    private final OrganizationMembershipService membershipService;
    private final OrganizationRepository organizationRepository;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = stripContextPath(request);
        if (path.startsWith("/actuator") || path.startsWith("/forms/public") || path.startsWith("/webhooks")) {
            return true;
        }
        return "/oauth/callback".equals(path);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        try {
            String path = stripContextPath(request);
            String method = request.getMethod();
            if (isAuthRouteWithoutOrganization(path, method)) {
                filterChain.doFilter(request, response);
                return;
            }

            ObjectId sessionId = authSessionService.readSessionIdFromCookie(request).orElse(null);
            if (sessionId == null) {
                writeError(response, HttpServletResponse.SC_UNAUTHORIZED, "Sign in required.");
                return;
            }

            AuthSession session;
            UserAccount user;
            try {
                session = authSessionService.requireValidSession(sessionId);
                user = userAuthService.requireUser(session.getUserId());
            } catch (UnauthorizedException ex) {
                writeError(response, HttpServletResponse.SC_UNAUTHORIZED, ex.getMessage());
                return;
            }

            AuthContext.set(user.getId(), session.getId(), user.isPlatformAdmin());

            if (isPlatformOrganizationAdminRoute(path, method)) {
                if (!user.isPlatformAdmin()) {
                    writeError(response, HttpServletResponse.SC_FORBIDDEN, "Platform administrator access required.");
                    return;
                }
                filterChain.doFilter(request, response);
                return;
            }

            String organizationId = session.getActiveOrganizationId();
            if (organizationId == null || organizationId.isBlank()) {
                writeError(response, HttpServletResponse.SC_BAD_REQUEST, "No active organization on session.");
                return;
            }
            try {
                membershipService.assertCanAccessOrganization(
                        user.getId(), organizationId, user.isPlatformAdmin());
            } catch (AccessDeniedException ex) {
                writeError(response, HttpServletResponse.SC_FORBIDDEN, ex.getMessage());
                return;
            }
            if (!organizationRepository.existsById(organizationId)) {
                writeError(response, HttpServletResponse.SC_NOT_FOUND, "Organization not found.");
                return;
            }
            OrganizationContext.setOrganizationId(organizationId);
            filterChain.doFilter(request, response);
        } finally {
            OrganizationContext.clear();
            AuthContext.clear();
        }
    }

    private static boolean isAuthRouteWithoutOrganization(String path, String method) {
        if (!path.startsWith("/auth/")) {
            return false;
        }
        if ("GET".equalsIgnoreCase(method)) {
            return "/auth/me".equals(path)
                    || "/auth/sign-in-options".equals(path)
                    || "/auth/sign-in".equals(path)
                    || "/auth/callback".equals(path);
        }
        if ("POST".equalsIgnoreCase(method)) {
            return "/auth/logout".equals(path)
                    || "/auth/demo/sign-in".equals(path)
                    || "/auth/session/organization".equals(path);
        }
        return false;
    }

    private static boolean isPlatformOrganizationAdminRoute(String path, String method) {
        if (!path.startsWith("/admin/organizations")) {
            return false;
        }
        return "GET".equalsIgnoreCase(method) || "POST".equalsIgnoreCase(method);
    }

    private static String stripContextPath(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String context = request.getContextPath();
        if (context != null && !context.isEmpty() && uri.startsWith(context)) {
            return uri.substring(context.length());
        }
        return uri;
    }

    private static void writeError(HttpServletResponse response, int status, String message)
            throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        String body = "{\"message\":\"" + message.replace("\"", "\\\"") + "\"}";
        response.getWriter().write(body);
    }
}
