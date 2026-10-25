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
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Arrays;
import java.util.Optional;

@Slf4j
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
            log.debug("readSessionIdFromCookie: request has no cookies (cookies array is null)");
            return Optional.empty();
        }
        String primaryName = authProperties.getSessionCookieName();
        for (Cookie c : cookies) {
            if (primaryName.equals(c.getName()) && c.getValue() != null && !c.getValue().isBlank()) {
                Optional<ObjectId> id = parseObjectId(c.getValue());
                if (id.isPresent()) {
                    log.debug("readSessionIdFromCookie: resolved valid sessionId from primary cookie '{}'", primaryName);
                    return id;
                }
            }
        }
        log.warn("readSessionIdFromCookie: no valid session cookie found among incoming cookies: {}",
                Arrays.stream(cookies).map(Cookie::getName).toList());
        return Optional.empty();
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
