package com.app.api.service.organization;

import com.app.api.context.AuthContext;
import com.app.api.context.OrganizationContext;
import com.app.common.auth.OrganizationRole;
import com.app.common.exception.AccessDeniedException;
import com.app.persistence.repository.OrganizationMembershipRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Component;

/**
 * Access guard for organization-level administrative operations.
 *
 * <p>Use {@link #requireOrgAdmin()} at the start of any service method or controller
 * that should be restricted to {@link OrganizationRole#ORGANIZATION_ADMIN} members or platform
 * administrators.
 *
 * <p>Platform administrators implicitly pass all organization admin checks — they have
 * full access to every organization they operate in.
 */
@Component
@RequiredArgsConstructor
public class OrganizationAdminAccess {

    private final OrganizationMembershipRepository membershipRepository;

    /**
     * Asserts that the current user is either a platform admin or an organization admin
     * in the active organization.
     *
     * @throws AccessDeniedException if the user lacks the required role
     */
    public void requireOrgAdmin() {
        // Platform admins have unrestricted access
        if (AuthContext.isPlatformAdmin()) {
            return;
        }

        ObjectId userId = AuthContext.requireUserId();
        String organizationId = OrganizationContext.requireOrganizationId();

        boolean isOrgAdmin = membershipRepository
                .findByUserIdAndOrganizationId(userId, organizationId)
                .map(membership -> membership.getRole() == OrganizationRole.ORGANIZATION_ADMIN)
                .orElse(false);

        if (!isOrgAdmin) {
            throw new AccessDeniedException(
                    "Organization administrator access required.");
        }
    }
}
