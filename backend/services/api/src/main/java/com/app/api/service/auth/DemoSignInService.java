package com.app.api.service.auth;

import com.app.api.config.AuthProperties;
import com.app.common.auth.OrganizationRole;
import com.app.common.auth.SignInMethod;
import com.app.common.entity.Organization;
import com.app.common.entity.OrganizationMembership;
import com.app.common.entity.UserAccount;
import com.app.common.exception.ValidationException;
import com.app.persistence.repository.OrganizationMembershipRepository;
import com.app.persistence.repository.OrganizationRepository;
import com.app.persistence.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.util.HashMap;

@Service
@RequiredArgsConstructor
public class DemoSignInService {

    public static final String DEMO_ADMIN_PROVIDER_ID = "workflow:demo:platform-admin";
    public static final String DEMO_ORG_ADMIN_PROVIDER_ID = "workflow:demo:org-admin";
    public static final String DEMO_USER_PROVIDER_ID = "workflow:demo:member";

    public static final String DEFAULT_ORG_ID = "platform-admin-org";
    public static final String DEMO_ORG_ID = "demo-org";

    private final AuthProperties authProperties;
    private final UserAccountRepository userAccountRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;

    public UserAccount signInAsAdmin() {
        assertDemoMode();
        ensureOrganizationsExist();
        UserAccount user = resolveOrCreateDemoUser(
                DEMO_ADMIN_PROVIDER_ID, "Platform Admin", "admin@workflow.local", true);
        ensureUserMembership(user.getId(), DEFAULT_ORG_ID, OrganizationRole.ORGANIZATION_ADMIN);
        return user;
    }

    public UserAccount signInAsOrgAdmin() {
        assertDemoMode();
        ensureOrganizationsExist();
        UserAccount user = resolveOrCreateDemoUser(
                DEMO_ORG_ADMIN_PROVIDER_ID, "Org Admin", "orgadmin@workflow.local", false);
        ensureUserMembership(user.getId(), DEMO_ORG_ID, OrganizationRole.ORGANIZATION_ADMIN);
        return user;
    }

    public UserAccount signInAsUser() {
        assertDemoMode();
        ensureOrganizationsExist();
        UserAccount user = resolveOrCreateDemoUser(
                DEMO_USER_PROVIDER_ID, "Org User", "user@workflow.local", false);
        ensureUserMembership(user.getId(), DEMO_ORG_ID, OrganizationRole.MEMBER);
        return user;
    }

    private void assertDemoMode() {
        if (!authProperties.isDemoSignInAvailable()) {
            throw new ValidationException("Demo sign-in is not enabled.");
        }
    }

    private void ensureOrganizationsExist() {
        if (!organizationRepository.existsById(DEFAULT_ORG_ID)) {
            Organization defaultOrg = new Organization();
            defaultOrg.setId(DEFAULT_ORG_ID);
            defaultOrg.setName("Platform Admin Organization");
            defaultOrg.setSettings(new HashMap<>());
            organizationRepository.save(defaultOrg);
        }
        if (!organizationRepository.existsById(DEMO_ORG_ID)) {
            Organization demoOrg = new Organization();
            demoOrg.setId(DEMO_ORG_ID);
            demoOrg.setName("Demo Organization");
            demoOrg.setSettings(new HashMap<>());
            organizationRepository.save(demoOrg);
        }
    }

    private void ensureUserMembership(ObjectId userId, String organizationId, OrganizationRole role) {
        OrganizationMembership membership = membershipRepository
                .findByUserIdAndOrganizationId(userId, organizationId)
                .orElse(null);
        if (membership == null) {
            membership = new OrganizationMembership();
            membership.setId(new ObjectId());
            membership.setUserId(userId);
            membership.setOrganizationId(organizationId);
            membership.setRole(role);
            membershipRepository.save(membership);
        } else if (membership.getRole() != role) {
            membership.setRole(role);
            membershipRepository.save(membership);
        }
    }

    private UserAccount resolveOrCreateDemoUser(
            String providerUserId, String displayName, String email, boolean platformAdmin) {
        UserAccount user = userAccountRepository
                .findBySignInMethodAndProviderUserId(SignInMethod.DEMO, providerUserId)
                .orElseGet(() -> {
                    UserAccount created = new UserAccount();
                    created.setId(new ObjectId());
                    created.setSignInMethod(SignInMethod.DEMO);
                    return created;
                });

        user.setProviderUserId(providerUserId);
        user.setDisplayName(displayName);
        user.setEmail(email);
        user.setPictureUrl(null);
        user.setPlatformAdmin(platformAdmin);

        return userAccountRepository.save(user);
    }
}
