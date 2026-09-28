package com.app.api.service.webhook;

import com.app.common.constant.TriggerRegistrationStatus;
import com.app.common.entity.TriggerRegistration;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.common.model.trigger.WebhookConfig;
import com.app.crypto.util.EncryptionService;
import com.app.persistence.repository.TriggerRegistrationRepository;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.EnumSet;
import java.util.Optional;
import java.util.UUID;

/**
 * Ensures webhook trigger registrations exist for each workflow.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookRegistrationService {

    private static final EnumSet<TriggerType> WEBHOOK_TYPES = EnumSet.of(TriggerType.WEBHOOK);

    private final TriggerRegistrationRepository registrationRepository;
    private final WorkflowDefinitionRepository definitionRepository;
    private final EncryptionService encryptionService;
    private final WebhookSubscribeLifecycle subscribeLifecycle;
    private final SecureRandom secureRandom = new SecureRandom();

    public void sync(WorkflowDefinition definition) {
        TriggerConfig trigger = definition.getTrigger();
        if (trigger == null || trigger.getType() == null || !WEBHOOK_TYPES.contains(trigger.getType())) {
            return;
        }

        boolean active = isActive(trigger);
        TriggerRegistration registration = upsertRegistration(definition, trigger.getType(), active);

        if (trigger.getType() == TriggerType.WEBHOOK && active && isSubscribeMode(trigger)) {
            subscribeLifecycle.onSync(definition, registration);
        }
    }

    public void deactivate(String workflowDefinitionId) {
        registrationRepository.findByWorkflowDefinitionId(workflowDefinitionId).ifPresent(reg -> {
            if (reg.getTriggerType() == TriggerType.WEBHOOK) {
                definitionRepository.findById(workflowDefinitionId).ifPresent(definition -> {
                    if (isSubscribeMode(definition.getTrigger())) {
                        subscribeLifecycle.onDeactivate(reg);
                    }
                });
            }
            reg.setStatus(TriggerRegistrationStatus.DISABLED);
            registrationRepository.save(reg);
        });
    }

    private TriggerRegistration upsertRegistration(
            WorkflowDefinition definition, TriggerType triggerType, boolean active) {
        Optional<TriggerRegistration> existing =
                registrationRepository.findByWorkflowDefinitionId(definition.getId());

        TriggerRegistration registration = existing.orElseGet(() -> TriggerRegistration.builder()
                .id(UUID.randomUUID().toString())
                .workflowDefinitionId(definition.getId())
                .triggerType(triggerType)
                .activatedAt(Instant.now())
                .build());

        registration.setWorkflowDefinitionId(definition.getId());
        registration.setTriggerType(triggerType);
        registration.setStatus(active ? TriggerRegistrationStatus.ACTIVE : TriggerRegistrationStatus.PAUSED);

        if (registration.getActivatedAt() == null) {
            registration.setActivatedAt(Instant.now());
        }

        ensureSigningSecret(registration);

        return registrationRepository.save(registration);
    }

    private void ensureSigningSecret(TriggerRegistration registration) {
        if (registration.getSigningSecret() != null && !registration.getSigningSecret().isBlank()) {
            return;
        }
        registration.setSigningSecret(encryptionService.encrypt(generateSigningSecret()));
    }

    private String generateSigningSecret() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private boolean isActive(TriggerConfig trigger) {
        if (trigger == null || trigger.getType() != TriggerType.WEBHOOK) {
            return false;
        }
        WebhookConfig webhook = trigger.getWebhook();
        return webhook == null || webhook.isActive();
    }

    private boolean isSubscribeMode(TriggerConfig trigger) {
        return trigger != null
                && trigger.getType() == TriggerType.WEBHOOK
                && trigger.getWebhook() != null
                && trigger.getWebhook().isSubscribeMode();
    }
}
