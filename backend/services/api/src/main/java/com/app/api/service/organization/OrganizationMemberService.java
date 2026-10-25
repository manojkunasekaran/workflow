package com.app.api.service.organization;

import com.app.api.context.AuthContext;
import com.app.api.context.OrganizationContext;
import com.app.api.dto.OrgMemberResponse;
import com.app.api.dto.InviteMemberRequest;
import com.app.common.auth.OrganizationRole;
import com.app.common.entity.OrganizationMembership;
import com.app.common.entity.UserAccount;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.exception.ValidationException;
import com.app.persistence.repository.OrganizationMembershipRepository;
import com.app.persistence.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service handling organization membership management.
 *
 * <p>Operations in this service assume that:
 * <ul>
 *   <li>The caller's organization context is populated in {@link OrganizationContext}.</li>
 *   <li>Authorization (org admin or platform admin) has already been verified by
 *       {@link OrganizationAdminAccess#requireOrgAdmin()} in the calling controller.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class OrganizationMemberService {

    private final OrganizationMembershipRepository membershipRepository;
    private final UserAccountRepository userAccountRepository;

    /**
     * Lists all members of the active organization.
     *
     * @return list of member responses with user details and their role
     */
    public List<OrgMemberResponse> listMembers() {
        String organizationId = OrganizationContext.requireOrganizationId();
        return membershipRepository.findByOrganizationId(organizationId).stream()
                .map(membership -> {
                    UserAccount user = userAccountRepository.findById(membership.getUserId())
                            .orElse(null);
                    return toResponse(membership, user);
                })
                .collect(Collectors.toList());
    }

    /**
     * Adds an existing user to the active organization.
     *
     * @param request contains the userId and desired role
     * @return the new membership response
     * @throws ResourceNotFoundException if the user does not exist
     * @throws ValidationException if the user is already a member
     */
    public OrgMemberResponse addMember(InviteMemberRequest request) {
        String organizationId = OrganizationContext.requireOrganizationId();

        ObjectId userId;
        try {
            userId = new ObjectId(request.getUserId());
        } catch (IllegalArgumentException e) {
            throw new ValidationException("Invalid user ID format.");
        }

        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", request.getUserId()));

        boolean alreadyMember = membershipRepository
                .findByUserIdAndOrganizationId(userId, organizationId)
                .isPresent();
        if (alreadyMember) {
            throw new ValidationException("User is already a member of this organization.");
        }

        OrganizationRole role = request.getRole() != null ? request.getRole() : OrganizationRole.MEMBER;

        OrganizationMembership membership = new OrganizationMembership();
        membership.setId(new ObjectId());
        membership.setUserId(userId);
        membership.setOrganizationId(organizationId);
        membership.setRole(role);
        OrganizationMembership saved = membershipRepository.save(membership);

        return toResponse(saved, user);
    }

    /**
     * Updates the role of an existing member.
     *
     * @param membershipId the ID of the membership record to update
     * @param newRole the new role to assign
     * @return the updated membership response
     * @throws ResourceNotFoundException if the membership does not belong to the active org
     * @throws ValidationException if attempting to change own role (admins cannot self-demote)
     */
    public OrgMemberResponse updateMemberRole(String membershipId, OrganizationRole newRole) {
        String organizationId = OrganizationContext.requireOrganizationId();
        ObjectId membershipObjectId;
        try {
            membershipObjectId = new ObjectId(membershipId);
        } catch (IllegalArgumentException e) {
            throw new ResourceNotFoundException("Membership", membershipId);
        }

        OrganizationMembership membership = membershipRepository.findById(membershipObjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Membership", membershipId));

        // Ensure the membership belongs to the active organization
        if (!organizationId.equals(membership.getOrganizationId())) {
            throw new ResourceNotFoundException("Membership", membershipId);
        }

        // Prevent self-demotion by an org admin (not platform admin)
        ObjectId currentUserId = AuthContext.requireUserId();
        if (!AuthContext.isPlatformAdmin() && membership.getUserId().equals(currentUserId)
                && newRole != OrganizationRole.ORGANIZATION_ADMIN) {
            throw new ValidationException(
                    "You cannot change your own role. Ask another organization admin.");
        }

        membership.setRole(newRole);
        OrganizationMembership saved = membershipRepository.save(membership);

        UserAccount user = userAccountRepository.findById(saved.getUserId()).orElse(null);
        return toResponse(saved, user);
    }

    /**
     * Removes a member from the active organization.
     *
     * @param membershipId the ID of the membership record to remove
     * @throws ResourceNotFoundException if the membership does not belong to the active org
     * @throws ValidationException if attempting to remove self (use account deletion instead)
     */
    public void removeMember(String membershipId) {
        String organizationId = OrganizationContext.requireOrganizationId();
        ObjectId membershipObjectId;
        try {
            membershipObjectId = new ObjectId(membershipId);
        } catch (IllegalArgumentException e) {
            throw new ResourceNotFoundException("Membership", membershipId);
        }

        OrganizationMembership membership = membershipRepository.findById(membershipObjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Membership", membershipId));

        // Ensure the membership belongs to the active organization
        if (!organizationId.equals(membership.getOrganizationId())) {
            throw new ResourceNotFoundException("Membership", membershipId);
        }

        // Prevent removing yourself
        ObjectId currentUserId = AuthContext.requireUserId();
        if (!AuthContext.isPlatformAdmin() && membership.getUserId().equals(currentUserId)) {
            throw new ValidationException(
                    "You cannot remove yourself from the organization.");
        }

        membershipRepository.deleteById(membershipObjectId);
    }

    private OrgMemberResponse toResponse(OrganizationMembership membership, UserAccount user) {
        return OrgMemberResponse.builder()
                .membershipId(membership.getId().toHexString())
                .userId(membership.getUserId().toHexString())
                .email(user != null ? user.getEmail() : null)
                .displayName(user != null ? user.getDisplayName() : null)
                .pictureUrl(user != null ? user.getPictureUrl() : null)
                .role(membership.getRole())
                .platformAdmin(user != null && user.isPlatformAdmin())
                .joinedAt(membership.getCreatedAt())
                .build();
    }
}
