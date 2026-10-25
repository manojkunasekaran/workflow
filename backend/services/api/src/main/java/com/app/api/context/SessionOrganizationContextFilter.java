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

/**
 * Security filter that runs at the highest precedence.
 *
 * <p>Responsibilities:
 * <ol>
 *   <li>Resolve the session cookie and load the authenticated user.</li>
 *   <li>Populate {@link AuthContext} (userId, sessionId, platformAdmin flag).</li>
 *   <li>For platform-admin-only routes ({@code /admin/organizations/**}, {@code /admin/connectors/**}):
 *       enforce {@link UserAccount#isPlatformAdmin()} or reject with 403.</li>
 *   <li>For all other authenticated routes: resolve the active organization from the session,
 *       validate membership, and populate {@link OrganizationContext}.</li>
 * </ol>
 *
 * <p><strong>Platform admin routes bypass organization context</strong> because platform admins
 * operate across all organizations and do not need a single active organization context.
 */
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
@RequiredArgsConstructor
public class SessionOrganizationContextFilter extends OncePerRequestFilter {

    private final AuthSessionService authSessionService;
    private final UserAuthService userAuthService;
    private final OrganizationMembershipService membershipService;
    private final OrganizationRepository organizationRepository;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String path = stripContextPath(request);
        return path.startsWith("/actuator")
                || path.startsWith("/forms/public")
                || path.startsWith("/webhooks")
                || path.startsWith("/mcp")
                || "/oauth/callback".equals(path);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        try {
            String path = stripContextPath(request);
            String method = request.getMethod();

            // Auth routes that do not require an active organization
            if (isAuthRouteWithoutOrganization(path, method)) {
                filterChain.doFilter(request, response);
                return;
            }

            // Resolve session and user for all other routes
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

            // Platform-admin-only routes: bypass organization context check
            if (isPlatformAdminRoute(path)) {
                if (!user.isPlatformAdmin()) {
                    writeError(response, HttpServletResponse.SC_FORBIDDEN,
                            "Platform administrator access required.");
                    return;
                }
                filterChain.doFilter(request, response);
                return;
            }

            // Standard organization-scoped routes
            String organizationId = session.getActiveOrganizationId();
            if (organizationId == null || organizationId.isBlank()) {
                writeError(response, HttpServletResponse.SC_BAD_REQUEST,
                        "No active organization on session.");
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

    /**
     * Auth endpoints that are reachable without an active organization on the session.
     * These routes handle authentication state transitions (sign-in, sign-out, org switch).
     */
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

    /**
     * Returns {@code true} for routes that are exclusively for platform administrators.
     * These routes bypass the organization context resolution and instead require
     * {@link UserAccount#isPlatformAdmin()} to be {@code true}.
     *
     * <p>Currently covered:
     * <ul>
     *   <li>{@code /admin/organizations/**} — platform org management</li>
     *   <li>{@code /admin/connectors/**} — platform system connector management</li>
     * </ul>
     */
    private static boolean isPlatformAdminRoute(String path) {
        return path.startsWith("/admin/organizations")
                || path.startsWith("/admin/connectors");
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
