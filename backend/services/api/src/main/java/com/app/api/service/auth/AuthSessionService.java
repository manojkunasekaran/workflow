package com.app.api.service.auth;

import com.app.api.config.AuthProperties;
import com.app.common.entity.AuthSession;
import com.app.common.entity.UserAccount;
import com.app.common.exception.UnauthorizedException;
import com.app.persistence.repository.AuthSessionRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Arrays;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthSessionService {

    private final AuthSessionRepository sessionRepository;
    private final AuthProperties authProperties;
    private final OrganizationMembershipService membershipService;

    public AuthSession createSession(UserAccount user, String activeOrganizationId) {
        AuthSession session = new AuthSession();
        session.setId(new ObjectId());
        session.setUserId(user.getId());
        session.setActiveOrganizationId(activeOrganizationId);
        session.setExpiresAt(Instant.now().plus(authProperties.getSessionTtl()));
        return sessionRepository.save(session);
    }

    public Optional<AuthSession> findValidSession(ObjectId sessionId) {
        if (sessionId == null) {
            return Optional.empty();
        }
        return sessionRepository.findById(sessionId).filter(this::isActive);
    }

    public AuthSession requireValidSession(ObjectId sessionId) {
        return findValidSession(sessionId)
                .orElseThrow(() -> new UnauthorizedException("Session is invalid or expired."));
    }

    public void revokeSession(ObjectId sessionId) {
        if (sessionId != null) {
            sessionRepository.deleteById(sessionId);
        }
    }

    public AuthSession switchActiveOrganization(
            AuthSession session, UserAccount user, String organizationId, boolean platformAdmin) {
        membershipService.assertCanAccessOrganization(user.getId(), organizationId, platformAdmin);
        session.setActiveOrganizationId(organizationId);
        return sessionRepository.save(session);
    }

    public void writeSessionCookie(HttpServletResponse response, ObjectId sessionId) {
        ResponseCookie cookie = ResponseCookie.from(authProperties.getSessionCookieName(), sessionId.toHexString())
                .httpOnly(true)
                .path("/")
                .sameSite("Lax")
                .maxAge(authProperties.getSessionTtl())
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    public void clearSessionCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(authProperties.getSessionCookieName(), "")
                .httpOnly(true)
                .path("/")
                .sameSite("Lax")
                .maxAge(0)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    public Optional<ObjectId> readSessionIdFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        return Arrays.stream(cookies)
                .filter(c -> authProperties.getSessionCookieName().equals(c.getName()))
                .map(Cookie::getValue)
                .filter(v -> v != null && !v.isBlank())
                .findFirst()
                .flatMap(this::parseObjectId);
    }

    private Optional<ObjectId> parseObjectId(String hex) {
        try {
            return Optional.of(new ObjectId(hex.trim()));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }

    private boolean isActive(AuthSession session) {
        return session.getExpiresAt() != null && session.getExpiresAt().isAfter(Instant.now());
    }

}
