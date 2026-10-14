package com.app.api.service.auth;

import com.app.api.config.AuthProperties;
import com.app.common.auth.SignInMethod;
import com.app.common.entity.UserAccount;
import com.app.common.exception.ValidationException;
import com.app.persistence.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DemoSignInService {

    static final String DEMO_ADMIN_PROVIDER_ID = "workflow360:demo:platform-admin";
    static final String DEMO_USER_PROVIDER_ID = "workflow360:demo:member";

    private final AuthProperties authProperties;
    private final UserAccountRepository userAccountRepository;
    private final UserAuthService userAuthService;

    public UserAccount signInAsAdmin() {
        assertDemoMode();
        return resolveOrCreateDemoUser(
                DEMO_ADMIN_PROVIDER_ID, "Demo Admin", "demo-admin@workflow360.local", true);
    }

    public UserAccount signInAsUser() {
        assertDemoMode();
        return resolveOrCreateDemoUser(
                DEMO_USER_PROVIDER_ID, "Demo User", "demo-user@workflow360.local", false);
    }

    private void assertDemoMode() {
        if (!authProperties.isDemoSignInAvailable()) {
            throw new ValidationException("Demo sign-in is not enabled.");
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
                    created.setProviderUserId(providerUserId);
                    return created;
                });

        user.setDisplayName(displayName);
        user.setEmail(email);
        user.setPictureUrl(null);
        user.setPlatformAdmin(platformAdmin);

        UserAccount saved = userAccountRepository.save(user);
        userAuthService.ensureDefaultOrganizationForUser(saved);
        return saved;
    }
}
