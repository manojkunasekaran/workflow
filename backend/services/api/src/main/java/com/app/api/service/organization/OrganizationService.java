package com.app.api.service.organization;

import com.app.api.dto.CreateOrganizationRequest;
import com.app.api.dto.OrganizationResponse;
import com.app.api.dto.UpdateOrganizationRequest;
import com.app.common.entity.Organization;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.exception.ValidationException;
import com.app.persistence.repository.OrganizationMembershipRepository;
import com.app.persistence.repository.OrganizationRepository;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final WorkflowDefinitionRepository workflowDefinitionRepository;

    public OrganizationResponse createOrganization(CreateOrganizationRequest request) {
        if (request.getName() == null || request.getName().isBlank()) {
            throw new ValidationException("Organization name is required.");
        }
        Organization org = new Organization();
        org.setId(UUID.randomUUID().toString());
        org.setName(request.getName().trim());
        org.setSettings(new HashMap<>());
        org.setCreatedAt(Instant.now());
        org.setUpdatedAt(Instant.now());
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
                .orElseThrow(() -> new ResourceNotFoundException("Organization", id));
        return toResponse(org);
    }

    public OrganizationResponse updateOrganization(String id, UpdateOrganizationRequest request) {
        Organization org = organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization", id));

        if (request.getName() != null && !request.getName().isBlank()) {
            org.setName(request.getName().trim());
        }
        if (request.getSettings() != null) {
            org.setSettings(request.getSettings());
        }
        org.setUpdatedAt(Instant.now());
        Organization saved = organizationRepository.save(org);
        return toResponse(saved);
    }

    public void deleteOrganization(String id) {
        Organization org = organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization", id));

        long totalOrgs = organizationRepository.count();
        if (totalOrgs <= 1) {
            throw new ValidationException("Cannot delete the only remaining organization on the platform.");
        }

        long workflowCount = workflowDefinitionRepository.countByOrganizationId(id);
        if (workflowCount > 0) {
            throw new ValidationException("Cannot delete organization with " + workflowCount + " active workflows. Delete all workflows first.");
        }

        membershipRepository.deleteByOrganizationId(id);
        organizationRepository.deleteById(id);
    }

    private OrganizationResponse toResponse(Organization org) {
        long memberCount = membershipRepository.countByOrganizationId(org.getId());
        long workflowCount = workflowDefinitionRepository.countByOrganizationId(org.getId());

        return OrganizationResponse.builder()
                .id(org.getId())
                .name(org.getName())
                .settings(org.getSettings())
                .memberCount(memberCount)
                .workflowCount(workflowCount)
                .createdAt(org.getCreatedAt())
                .build();
    }
}
