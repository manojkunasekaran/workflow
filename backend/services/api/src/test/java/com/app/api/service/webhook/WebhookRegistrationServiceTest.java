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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebhookRegistrationServiceTest {

    @Mock
    private TriggerRegistrationRepository registrationRepository;
    @Mock
    private WorkflowDefinitionRepository definitionRepository;
    @Mock
    private EncryptionService encryptionService;
    @Mock
    private WebhookSubscribeLifecycle subscribeLifecycle;

    private WebhookRegistrationService service;

    @BeforeEach
    void setUp() {
        service = new WebhookRegistrationService(
                registrationRepository, definitionRepository, encryptionService, subscribeLifecycle);
    }

    @Test
    void sync_generatesSigningSecretOnFirstSave() {
        when(encryptionService.encrypt(any())).thenAnswer(inv -> "enc_" + inv.getArgument(0));
        WorkflowDefinition definition = webhookDefinition("def-1", true);

        when(registrationRepository.findByWorkflowDefinitionId("def-1")).thenReturn(Optional.empty());
        when(registrationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.sync(definition);

        ArgumentCaptor<TriggerRegistration> captor = ArgumentCaptor.forClass(TriggerRegistration.class);
        verify(registrationRepository).save(captor.capture());
        TriggerRegistration saved = captor.getValue();

        assertEquals("def-1", saved.getWorkflowDefinitionId());
        assertEquals(TriggerRegistrationStatus.ACTIVE, saved.getStatus());
        assertNotNull(saved.getSigningSecret());
        assertEquals("enc_", saved.getSigningSecret().substring(0, 4));
    }

    @Test
    void sync_preservesExistingSigningSecretOnResync() {
        WorkflowDefinition definition = webhookDefinition("def-1", true);

        TriggerRegistration existing = TriggerRegistration.builder()
                .id("reg-1")
                .workflowDefinitionId("def-1")
                .triggerType(TriggerType.WEBHOOK)
                .signingSecret("enc_existing")
                .build();

        when(registrationRepository.findByWorkflowDefinitionId("def-1")).thenReturn(Optional.of(existing));
        when(registrationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.sync(definition);

        ArgumentCaptor<TriggerRegistration> captor = ArgumentCaptor.forClass(TriggerRegistration.class);
        verify(registrationRepository).save(captor.capture());
        TriggerRegistration saved = captor.getValue();

        assertEquals("enc_existing", saved.getSigningSecret());
        verify(encryptionService, never()).encrypt(any());
    }

    @Test
    void deactivate_setsDisabled() {
        TriggerRegistration registration = TriggerRegistration.builder()
                .id("reg-1")
                .workflowDefinitionId("def-1")
                .triggerType(TriggerType.WEBHOOK)
                .status(TriggerRegistrationStatus.ACTIVE)
                .build();

        when(registrationRepository.findByWorkflowDefinitionId("def-1")).thenReturn(Optional.of(registration));
        when(registrationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.deactivate("def-1");

        assertEquals(TriggerRegistrationStatus.DISABLED, registration.getStatus());
        verify(registrationRepository).save(registration);
    }

    private WorkflowDefinition webhookDefinition(String definitionId, boolean active) {
        WorkflowDefinition definition = new WorkflowDefinition();
        definition.setId(definitionId);
        definition.setTrigger(TriggerConfig.builder()
                .type(TriggerType.WEBHOOK)
                .webhook(WebhookConfig.builder().active(active).build())
                .build());
        return definition;
    }
}
