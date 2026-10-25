package com.app.api.service.form;

import com.app.common.entity.WorkflowDefinition;
import com.app.common.exception.ValidationException;
import com.app.common.model.form.FormSlugUtils;
import com.app.common.model.trigger.FormEnvironment;
import com.app.common.model.trigger.FormTriggerConfig;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.persistence.entity.FormRegistrationEntity;
import com.app.persistence.repository.FormRegistrationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FormRegistrationService {

    private final FormRegistrationRepository registrationRepository;

    public void deleteForWorkflowDefinition(String workflowDefinitionId) {
        registrationRepository.findByWorkflowDefinitionId(workflowDefinitionId).forEach(registrationRepository::delete);
    }

    public void syncFromWorkflowDefinition(WorkflowDefinition definition) {
        TriggerConfig trigger = definition.getTrigger();
        if (trigger == null || trigger.getType() != TriggerType.FORM || trigger.getForm() == null) {
            registrationRepository.findByWorkflowDefinitionId(definition.getId()).forEach(registrationRepository::delete);
            return;
        }
        FormTriggerConfig form = trigger.getForm();
        if (form.getSlug() == null || form.getSlug().isBlank()) {
            throw new ValidationException("Form trigger requires a slug");
        }
        upsertRegistration(definition, FormEnvironment.PROD, form.isActive());
        upsertRegistration(definition, FormEnvironment.TEST, true);
    }

    private void upsertRegistration(WorkflowDefinition definition, FormEnvironment environment, boolean active) {
        FormRegistrationEntity entity = registrationRepository
                .findByWorkflowDefinitionIdAndEnvironment(definition.getId(), environment)
                .orElseGet(() -> {
                    FormRegistrationEntity created = new FormRegistrationEntity();
                    created.setId(UUID.randomUUID().toString());
                    created.setSessionSigningSecret(UUID.randomUUID().toString());
                    return created;
                });
        entity.setOrganizationId(definition.getOrganizationId());
        entity.setWorkflowDefinitionId(definition.getId());
        entity.setEnvironment(environment);
        String registrationSlug =
                FormSlugUtils.registrationSlug(definition.getTrigger().getForm().getSlug(), environment);
        registrationRepository
                .findByEnvironmentAndSlug(environment, registrationSlug)
                .filter(existing -> !existing.getWorkflowDefinitionId().equals(definition.getId()))
                .ifPresent(existing -> {
                    throw new ValidationException(
                            "Form slug '"
                                    + definition.getTrigger().getForm().getSlug()
                                    + "' is already used by another workflow");
                });
        entity.setSlug(registrationSlug);
        entity.setActive(active && definition.getTrigger().getForm().isActive());
        entity.setUpdatedAt(Instant.now());
        registrationRepository.save(entity);
    }
}
