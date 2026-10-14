package com.app.api.service.organization;

import com.app.api.context.OrganizationContext;
import com.app.common.entity.Organization;
import com.app.common.exception.ResourceNotFoundException;
import com.app.persistence.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OrganizationAccess {

    private final OrganizationRepository organizationRepository;

    public String requireOrganizationId() {
        return OrganizationContext.requireOrganizationId();
    }

    public Organization requireOrganization() {
        String id = requireOrganizationId();
        return organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization", id));
    }

    /** Hide cross-organization resources as not found. */
    public void assertSameOrganization(String resourceOrganizationId) {
        if (resourceOrganizationId == null
                || !requireOrganizationId().equals(resourceOrganizationId)) {
            throw new ResourceNotFoundException("Resource", "organization mismatch");
        }
    }

    public void assertOrganizationExists(String organizationId) {
        if (organizationId == null
                || organizationId.isBlank()
                || !organizationRepository.existsById(organizationId.trim())) {
            throw new ResourceNotFoundException("Organization", organizationId);
        }
    }
}
