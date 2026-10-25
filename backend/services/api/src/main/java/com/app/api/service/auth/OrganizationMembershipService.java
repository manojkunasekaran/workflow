package com.app.api.service.auth;

import com.app.api.dto.AuthOrganizationSummary;
import com.app.common.auth.OrganizationRole;
import com.app.common.entity.Organization;
import com.app.common.entity.OrganizationMembership;
import com.app.common.entity.UserAccount;
import com.app.common.exception.AccessDeniedException;
import com.app.persistence.repository.OrganizationMembershipRepository;
import com.app.persistence.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OrganizationMembershipService {

    private final OrganizationMembershipRepository membershipRepository;
    private final OrganizationRepository organizationRepository;

    public List<AuthOrganizationSummary> listOrganizationsForUser(UserAccount user, boolean platformAdmin) {
        List<AuthOrganizationSummary> result = new ArrayList<>();
        if (platformAdmin) {
            for (Organization org : organizationRepository.findAll()) {
                OrganizationRole role = membershipRepository
                        .findByUserIdAndOrganizationId(user.getId(), org.getId())
                        .map(OrganizationMembership::getRole)
                        .orElse(null);
                result.add(new AuthOrganizationSummary(org.getId(), org.getName(), role));
            }
            return result;
        }
        for (OrganizationMembership membership : membershipRepository.findByUserId(user.getId())) {
            organizationRepository.findById(membership.getOrganizationId()).ifPresent(org -> result.add(
                    new AuthOrganizationSummary(org.getId(), org.getName(), membership.getRole())));
        }
        return result;
    }

    public void assertCanAccessOrganization(ObjectId userId, String organizationId, boolean platformAdmin) {
        if (platformAdmin) {
            if (!organizationRepository.existsById(organizationId)) {
                throw new AccessDeniedException("Organization not found.");
            }
            return;
        }
        Optional<OrganizationMembership> membership =
                membershipRepository.findByUserIdAndOrganizationId(userId, organizationId);
        if (membership.isEmpty()) {
            throw new AccessDeniedException("You are not a member of this organization.");
        }
    }

    public OrganizationMembership addMembership(
            ObjectId userId, String organizationId, OrganizationRole role) {
        Optional<OrganizationMembership> existing =
                membershipRepository.findByUserIdAndOrganizationId(userId, organizationId);
        if (existing.isPresent()) {
            return existing.get();
        }
        OrganizationMembership membership = new OrganizationMembership();
        membership.setId(new ObjectId());
        membership.setUserId(userId);
        membership.setOrganizationId(organizationId);
        membership.setRole(role);
        return membershipRepository.save(membership);
    }
}
