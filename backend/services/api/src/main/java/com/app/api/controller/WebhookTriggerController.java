package com.app.api.controller;

import com.app.api.dto.WebhookStateResponse;
import com.app.api.service.organization.OrganizationAccess;
import com.app.api.service.webhook.WebhookInboundExecutionService;
import com.app.common.entity.TriggerWebhookLog;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.exception.ValidationException;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Authenticated webhook trigger state endpoints.
 *
 * <p>All operations are scoped to the caller's active organization via
 * {@link OrganizationAccess#assertSameOrganization} to prevent cross-tenant IDOR.
 */
@RestController
@RequestMapping("/workflows/{id}/trigger/webhook")
@RequiredArgsConstructor
public class WebhookTriggerController {

    private final WorkflowDefinitionRepository definitionRepository;
    private final WebhookInboundExecutionService inboundExecutionService;
    private final OrganizationAccess organizationAccess;

    @GetMapping("/state")
    public WebhookStateResponse getWebhookState(@PathVariable("id") String workflowId) {
        WorkflowDefinition definition = requireDefinitionInOrganization(workflowId);
        validateWebhookTrigger(definition);
        return inboundExecutionService.getWebhookState(workflowId);
    }

    @GetMapping("/logs")
    public Page<TriggerWebhookLog> getWebhookLogs(
            @PathVariable("id") String workflowId,
            @PageableDefault(size = 20, sort = "timestamp", direction = Sort.Direction.DESC) Pageable pageable) {
        WorkflowDefinition definition = requireDefinitionInOrganization(workflowId);
        validateWebhookTrigger(definition);
        return inboundExecutionService.getWebhookLogs(workflowId, pageable);
    }

    /**
     * Fetches the workflow definition and asserts it belongs to the caller's active organization.
     * Returns 404 on org mismatch to prevent ID enumeration.
     */
    private WorkflowDefinition requireDefinitionInOrganization(String workflowId) {
        WorkflowDefinition definition = definitionRepository.findById(workflowId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowDefinition", workflowId));
        organizationAccess.assertSameOrganization(definition.getOrganizationId());
        return definition;
    }

    private void validateWebhookTrigger(WorkflowDefinition definition) {
        TriggerConfig trigger = definition.getTrigger();
        if (trigger == null || trigger.getType() != TriggerType.WEBHOOK || trigger.getWebhook() == null) {
            throw new ValidationException(
                    "Workflow '" + definition.getName() + "' does not have a WEBHOOK trigger configured.");
        }
    }
}
