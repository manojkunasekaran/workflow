package com.app.api.service.webhook;

import com.app.api.exception.WebhookInboundException;
import com.app.common.constant.TriggerRegistrationStatus;
import com.app.common.entity.TriggerRegistration;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.common.model.trigger.WebhookConfig;
import com.app.common.model.trigger.WebhookInboundConfig;
import com.app.persistence.repository.TriggerRegistrationRepository;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Resolves a public callback token to an active registration and workflow definition.
 */
@Component
@RequiredArgsConstructor
public class WebhookInboundResolver {

    private final TriggerRegistrationRepository registrationRepository;
    private final WorkflowDefinitionRepository definitionRepository;

    public ResolvedWebhookInbound resolve(String workflowId) {
        TriggerRegistration registration = registrationRepository.findByWorkflowDefinitionId(workflowId)
                .orElseThrow(() -> new ResourceNotFoundException("WebhookRegistration", workflowId));

        if (registration.getStatus() == TriggerRegistrationStatus.ERROR) {
            throw new WebhookInboundException(
                    HttpStatus.SERVICE_UNAVAILABLE, "Webhook registration is in error state");
        }
        if (registration.getStatus() != TriggerRegistrationStatus.ACTIVE) {
            throw new WebhookInboundException(
                    HttpStatus.NOT_FOUND, "Webhook registration is not active");
        }

        WorkflowDefinition definition = definitionRepository
                .findById(registration.getWorkflowDefinitionId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "WorkflowDefinition", registration.getWorkflowDefinitionId()));

        TriggerConfig trigger = definition.getTrigger();
        if (trigger == null || trigger.getType() == null) {
            throw new WebhookInboundException(
                    HttpStatus.NOT_FOUND, "Workflow trigger is not configured");
        }
        if (trigger.getType() != registration.getTriggerType()) {
            throw new WebhookInboundException(
                    HttpStatus.NOT_FOUND, "Workflow trigger type does not match registration");
        }
        if (trigger.getType() != TriggerType.WEBHOOK) {
            throw new WebhookInboundException(
                    HttpStatus.NOT_FOUND, "Workflow does not have a webhook trigger configured");
        }

        if (!isTriggerActive(trigger)) {
            throw new WebhookInboundException(
                    HttpStatus.NOT_FOUND, "Webhook trigger is currently disabled");
        }

        WebhookInboundConfig inbound = resolveInboundConfig(trigger);
        return ResolvedWebhookInbound.builder()
                .registration(registration)
                .definition(definition)
                .triggerType(trigger.getType())
                .inbound(inbound != null ? inbound : WebhookInboundConfig.builder().build())
                .build();
    }

    private boolean isTriggerActive(TriggerConfig trigger) {
        if (trigger.getType() != TriggerType.WEBHOOK) {
            return false;
        }
        WebhookConfig webhook = trigger.getWebhook();
        return webhook == null || webhook.isActive();
    }

    private WebhookInboundConfig resolveInboundConfig(TriggerConfig trigger) {
        if (trigger.getType() == TriggerType.WEBHOOK && trigger.getWebhook() != null) {
            return trigger.getWebhook().getInbound();
        }
        return null;
    }

    @Getter
    @Builder
    public static class ResolvedWebhookInbound {
        private final TriggerRegistration registration;
        private final WorkflowDefinition definition;
        private final TriggerType triggerType;
        private final WebhookInboundConfig inbound;
    }
}
