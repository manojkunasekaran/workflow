package com.app.api.service;

import com.app.api.dto.AssignUseCaseRequest;
import com.app.api.dto.CreateIntegrationRequest;
import com.app.api.dto.IntegrationResponse;
import com.app.api.dto.UpdateIntegrationRequest;
import com.app.common.entity.WorkflowDefinition;
import com.app.persistence.entity.ConnectorManifestEntity;
import com.app.persistence.entity.IntegrationEntity;
import com.app.persistence.entity.IntegrationScope;
import com.app.persistence.entity.IntegrationStatus;
import com.app.persistence.repository.ConnectorManifestRepository;
import com.app.persistence.repository.IntegrationRepository;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import lombok.RequiredArgsConstructor;
import com.app.common.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class IntegrationService {

    private static final String DEFAULT_ORG_ID = "default-org";

    private final IntegrationRepository integrationRepository;
    private final ConnectorManifestRepository connectorManifestRepository;
    private final WorkflowDefinitionRepository workflowDefinitionRepository;

    @Transactional
    public IntegrationResponse createIntegration(CreateIntegrationRequest request) {
        // Validate connectors
        ConnectorManifestEntity source = connectorManifestRepository.findFirstByConnectorId(request.getSourceConnectorId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid source connector ID"));
        ConnectorManifestEntity destination = connectorManifestRepository.findFirstByConnectorId(request.getDestinationConnectorId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid destination connector ID"));

        IntegrationEntity entity = IntegrationEntity.builder()
                .name(request.getName())
                .description(request.getDescription())
                .sourceConnectorId(request.getSourceConnectorId())
                .destinationConnectorId(request.getDestinationConnectorId())
                .scope(request.getScope() != null ? request.getScope() : IntegrationScope.USER)
                .status(IntegrationStatus.DRAFT)
                .organizationId(DEFAULT_ORG_ID) // TODO: Extract organizationId from Spring Security context
                .tags(request.getTags())
                .build();

        IntegrationEntity saved = integrationRepository.save(entity);
        return toResponse(saved);
    }

    public IntegrationResponse getIntegration(String id) {
        IntegrationEntity entity = integrationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Integration", id));
        return toResponse(entity);
    }

    public List<IntegrationResponse> listIntegrations() {
        List<IntegrationEntity> systemPublished = integrationRepository.findByScopeAndStatus(IntegrationScope.SYSTEM, IntegrationStatus.PUBLISHED);
        // TODO: Extract organizationId from Spring Security context
        List<IntegrationEntity> orgIntegrations = integrationRepository.findByOrganizationIdAndStatus(DEFAULT_ORG_ID, IntegrationStatus.DRAFT); // Wait, instruction says "all integrations for DEFAULT_ORG_ID"

        // instruction says "all integrations for DEFAULT_ORG_ID"
        List<IntegrationEntity> orgIntegrationsAll = integrationRepository.findAll().stream()
                .filter(i -> DEFAULT_ORG_ID.equals(i.getOrganizationId()))
                .collect(Collectors.toList());

        Set<String> seen = new HashSet<>();
        List<IntegrationEntity> combined = new ArrayList<>();

        for (IntegrationEntity entity : systemPublished) {
            if (seen.add(entity.getId())) {
                combined.add(entity);
            }
        }
        for (IntegrationEntity entity : orgIntegrationsAll) {
            if (seen.add(entity.getId())) {
                combined.add(entity);
            }
        }

        return combined.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public IntegrationResponse updateIntegration(String id, UpdateIntegrationRequest request) {
        IntegrationEntity entity = integrationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Integration", id));
        
        // TODO: Enforce ownership check via security context (organizationId)

        if (request.getName() != null) {
            entity.setName(request.getName());
        }
        if (request.getDescription() != null) {
            entity.setDescription(request.getDescription());
        }
        if (request.getTags() != null) {
            entity.setTags(request.getTags());
        }

        IntegrationEntity saved = integrationRepository.save(entity);
        return toResponse(saved);
    }

    @Transactional
    public void publishIntegration(String id) {
        IntegrationEntity entity = integrationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Integration", id));
        if (entity.getStatus() != IntegrationStatus.DRAFT) {
            throw new IllegalArgumentException("Only DRAFT integrations can be published");
        }
        entity.setStatus(IntegrationStatus.PUBLISHED);
        integrationRepository.save(entity);
    }

    @Transactional
    public void deprecateIntegration(String id) {
        IntegrationEntity entity = integrationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Integration", id));
        entity.setStatus(IntegrationStatus.DEPRECATED);
        integrationRepository.save(entity);
    }

    @Transactional
    public void deleteIntegration(String id) {
        IntegrationEntity entity = integrationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Integration", id));
        if (entity.getStatus() == IntegrationStatus.PUBLISHED || entity.getStatus() == IntegrationStatus.DEPRECATED) {
            throw new IllegalArgumentException("Only DRAFT integrations can be deleted");
        }

        List<WorkflowDefinition> workflows = workflowDefinitionRepository.findByIntegrationId(id);
        for (WorkflowDefinition workflow : workflows) {
            workflow.setIntegrationId(null);
            workflow.setUseCaseTitle(null);
            workflow.setUseCaseDescription(null);
            workflowDefinitionRepository.save(workflow);
        }

        integrationRepository.delete(entity);
    }

    @Transactional
    public IntegrationResponse assignUseCase(String integrationId, AssignUseCaseRequest request) {
        IntegrationEntity integration = integrationRepository.findById(integrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Integration", integrationId));

        WorkflowDefinition workflow = workflowDefinitionRepository.findById(request.getWorkflowId())
                .orElseThrow(() -> new ResourceNotFoundException("Workflow", request.getWorkflowId()));

        if (workflow.getIntegrationId() != null && !workflow.getIntegrationId().equals(integrationId)) {
            throw new IllegalArgumentException("Workflow is already assigned to another integration");
        }

        workflow.setIntegrationId(integrationId);
        workflow.setUseCaseTitle(request.getUseCaseTitle());
        workflow.setUseCaseDescription(request.getUseCaseDescription());
        workflowDefinitionRepository.save(workflow);

        return toResponse(integration);
    }

    @Transactional
    public void removeUseCase(String integrationId, String workflowId) {
        WorkflowDefinition workflow = workflowDefinitionRepository.findById(workflowId)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow", workflowId));

        if (!integrationId.equals(workflow.getIntegrationId())) {
            throw new IllegalArgumentException("Workflow is not assigned to this integration");
        }

        workflow.setIntegrationId(null);
        workflow.setUseCaseTitle(null);
        workflow.setUseCaseDescription(null);
        workflowDefinitionRepository.save(workflow);
    }

    private IntegrationResponse toResponse(IntegrationEntity entity) {
        ConnectorManifestEntity source = connectorManifestRepository.findFirstByConnectorId(entity.getSourceConnectorId()).orElse(null);
        ConnectorManifestEntity destination = connectorManifestRepository.findFirstByConnectorId(entity.getDestinationConnectorId()).orElse(null);
        
        List<WorkflowDefinition> workflows = workflowDefinitionRepository.findByIntegrationId(entity.getId());
        int useCaseCount = workflows != null ? workflows.size() : 0;

        return IntegrationResponse.builder()
                .id(entity.getId())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .lastModifiedBy(entity.getLastModifiedBy())
                .name(entity.getName())
                .description(entity.getDescription())
                .sourceConnectorId(entity.getSourceConnectorId())
                .destinationConnectorId(entity.getDestinationConnectorId())
                .scope(entity.getScope())
                .status(entity.getStatus())
                .organizationId(entity.getOrganizationId())
                .ownerId(entity.getOwnerId())
                .tags(entity.getTags())
                .sourceConnectorName(source != null ? source.getDisplayName() : null)
                .sourceConnectorIcon(source != null ? source.getIcon() : null)
                .destinationConnectorName(destination != null ? destination.getDisplayName() : null)
                .destinationConnectorIcon(destination != null ? destination.getIcon() : null)
                .useCaseCount(useCaseCount)
                .build();
    }
}
