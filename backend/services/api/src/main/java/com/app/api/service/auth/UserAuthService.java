package com.app.api.service.auth;

import com.app.api.config.AuthProperties;
import com.app.api.dto.AuthMeResponse;
import com.app.api.dto.AuthOrganizationSummary;
import com.app.common.auth.OrganizationRole;
import com.app.common.auth.SignInMethod;
import com.app.common.entity.AuthSession;
import com.app.common.entity.Organization;
import com.app.common.entity.UserAccount;
import com.app.common.exception.UnauthorizedException;
import com.app.persistence.repository.OrganizationRepository;
import com.app.persistence.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class UserAuthService {

    private final UserAccountRepository userAccountRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipService membershipService;
    private final AuthProperties authProperties;

    public UserAccount requireUser(ObjectId userId) {
        return userAccountRepository
                .findById(userId)
                .orElseThrow(() -> new UnauthorizedException("User not found."));
    }

    public AuthMeResponse buildMeResponse(UserAccount user, AuthSession session) {
        List<AuthOrganizationSummary> organizations =
                membershipService.listOrganizationsForUser(user, user.isPlatformAdmin());
        return AuthMeResponse.builder()
                .userId(user.getId().toHexString())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .pictureUrl(user.getPictureUrl())
                .platformAdmin(user.isPlatformAdmin())
                .signInRequired(authProperties.isSignInRequired())
                .authMode(authProperties.getMode())
                .activeOrganizationId(session != null ? session.getActiveOrganizationId() : null)
                .organizations(organizations)
                .build();
    }

    public UserAccount upsertOAuthUser(
            String providerUserId, String email, String displayName, String pictureUrl) {
        UserAccount user = userAccountRepository
                .findBySignInMethodAndProviderUserId(SignInMethod.OAUTH, providerUserId)
                .orElseGet(() -> {
                    UserAccount created = new UserAccount();
                    created.setId(new ObjectId());
                    created.setSignInMethod(SignInMethod.OAUTH);
                    created.setProviderUserId(providerUserId);
                    return created;
                });

        user.setEmail(email);
        user.setDisplayName(displayName);
        user.setPictureUrl(pictureUrl);

        if (!userAccountRepository.existsById(user.getId()) && userAccountRepository.count() == 0) {
            user.setPlatformAdmin(true);
        } else if (!user.isPlatformAdmin() && email != null && isPlatformAdminEmail(email)) {
            user.setPlatformAdmin(true);
        }

        UserAccount saved = userAccountRepository.save(user);
        ensureDefaultOrganization(saved);
        return saved;
    }

    public void ensureDefaultOrganizationForUser(UserAccount user) {
        ensureDefaultOrganization(user);
    }

    private boolean isPlatformAdminEmail(String email) {
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        return authProperties.getPlatformAdminEmails().stream()
                .map(e -> e.trim().toLowerCase(Locale.ROOT))
                .anyMatch(normalized::equals);
    }

    private void ensureDefaultOrganization(UserAccount user) {
        if (user.isPlatformAdmin()) {
            if (organizationRepository.existsById("platform-admin-org")) {
                boolean hasDefaultOrg = membershipService.listOrganizationsForUser(user, false).stream()
                        .anyMatch(o -> "platform-admin-org".equals(o.getId()));
                if (!hasDefaultOrg) {
                    membershipService.addMembership(user.getId(), "platform-admin-org", OrganizationRole.ORGANIZATION_ADMIN);
                }
                return;
            }
        }
        if (!membershipService.listOrganizationsForUser(user, false).isEmpty()) {
            return;
        }
        if (organizationRepository.existsById("platform-admin-org")) {
            membershipService.addMembership(
                    user.getId(), "platform-admin-org", user.isPlatformAdmin() ? OrganizationRole.ORGANIZATION_ADMIN : OrganizationRole.MEMBER);
            return;
        }
        Organization org = new Organization();
        org.setId(new ObjectId().toHexString());
        String label = user.getDisplayName();
        if (label == null || label.isBlank()) {
            label = user.getEmail() != null ? user.getEmail().split("@")[0] : "My";
        }
        org.setName(label.trim() + " Organization");
        org.setSettings(new HashMap<>());
        organizationRepository.save(org);
        membershipService.addMembership(user.getId(), org.getId(), OrganizationRole.ORGANIZATION_ADMIN);
    }
}
