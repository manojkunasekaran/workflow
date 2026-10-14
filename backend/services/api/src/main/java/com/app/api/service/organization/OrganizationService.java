package com.app.api.service.organization;

import com.app.api.dto.CreateOrganizationRequest;
import com.app.api.dto.OrganizationResponse;
import com.app.common.entity.Organization;
import com.app.common.exception.ValidationException;
import com.app.persistence.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrganizationService {

    private final OrganizationRepository organizationRepository;

    public OrganizationResponse createOrganization(CreateOrganizationRequest request) {
        if (request.getName() == null || request.getName().isBlank()) {
            throw new ValidationException("Organization name is required.");
        }
        Organization org = new Organization();
        org.setId(UUID.randomUUID().toString());
        org.setName(request.getName().trim());
        org.setSettings(new HashMap<>());
        Organization saved = organizationRepository.save(org);
        return toResponse(saved);
    }

    public List<OrganizationResponse> listOrganizations() {
        return organizationRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public OrganizationResponse getOrganization(String id) {
        Organization org = organizationRepository.findById(id)
                .orElseThrow(() -> new ValidationException("Organization not found."));
        return toResponse(org);
    }

    private OrganizationResponse toResponse(Organization org) {
        return OrganizationResponse.builder()
                .id(org.getId())
                .name(org.getName())
                .build();
    }
}
