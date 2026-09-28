package com.app.api.service.webhook;

import com.app.api.config.properties.WorkflowApiProperties;
import com.app.api.service.poll.PollHttpExecutor;
import com.app.api.service.poll.PollHttpResult;
import com.app.common.constant.TriggerRegistrationStatus;
import com.app.common.constant.TriggerWebhookEventType;
import com.app.common.entity.TriggerRegistration;
import com.app.common.entity.TriggerWebhookLog;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.model.trigger.PollHttpConfig;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.common.model.trigger.WebhookConfig;
import com.app.common.model.trigger.WebhookDeliveryMode;
import com.app.crypto.util.EncryptionService;
import com.app.persistence.repository.TriggerRegistrationRepository;
import com.app.persistence.repository.TriggerWebhookLogRepository;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebhookSubscribeServiceTest {

    @Mock
    private WorkflowDefinitionRepository definitionRepository;
    @Mock
    private TriggerRegistrationRepository registrationRepository;
    @Mock
    private TriggerWebhookLogRepository webhookLogRepository;
    @Mock
    private PollHttpExecutor httpExecutor;
    @Mock
    private WebhookUrlBuilder webhookUrlBuilder;
    @Mock
    private EncryptionService encryptionService;

    private WebhookSubscribeService service;

    @BeforeEach
    void setUp() {
        WorkflowApiProperties properties = new WorkflowApiProperties();
        service = new WebhookSubscribeService(
                definitionRepository,
                registrationRepository,
                webhookLogRepository,
                httpExecutor,
                webhookUrlBuilder,
                encryptionService,
                properties,
                new ObjectMapper());
    }

    @Test
    void onSync_callsSubscribeAndPersistsExternalId() {
        WorkflowDefinition definition = subscribeDefinition();
        TriggerRegistration registration = registration("reg-1", null, null);

        when(webhookUrlBuilder.buildCallbackUrl("def-1"))
                .thenReturn("https://api.example.com/rest/webhook-events/def-1");
        when(httpExecutor.execute(any())).thenReturn(PollHttpResult.builder()
                .success(true)
                .statusCode(200)
                .durationMs(50L)
                .body(Map.of("id", "vendor-sub-99"))
                .build());
        when(registrationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(webhookLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.onSync(definition, registration);

        verify(httpExecutor).execute(any());
        assertEquals("vendor-sub-99", registration.getExternalSubscriptionId());
        assertEquals(0, registration.getConsecutiveFailures());
        assertNotNull(registration.getConfigFingerprint());

        ArgumentCaptor<TriggerWebhookLog> logCaptor = ArgumentCaptor.forClass(TriggerWebhookLog.class);
        verify(webhookLogRepository).save(logCaptor.capture());
        assertEquals(TriggerWebhookEventType.SUBSCRIBE, logCaptor.getValue().getEventType());
    }

    @Test
    void onSync_skipsSubscribeWhenFingerprintUnchanged() {
        WorkflowDefinition definition = subscribeDefinition();
        TriggerRegistration registration = registration("reg-1", null, null);

        when(webhookUrlBuilder.buildCallbackUrl("def-1"))
                .thenReturn("https://api.example.com/rest/webhook-events/def-1");
        when(httpExecutor.execute(any())).thenReturn(PollHttpResult.builder()
                .success(true)
                .statusCode(200)
                .durationMs(50L)
                .body(Map.of("id", "vendor-sub-existing"))
                .build());
        when(registrationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(webhookLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.onSync(definition, registration);
        String fingerprint = registration.getConfigFingerprint();

        TriggerRegistration unchanged = registration("reg-1", "vendor-sub-existing", fingerprint);
        service.onSync(definition, unchanged);

        verify(httpExecutor, times(1)).execute(any());
    }

    @Test
    void onDeactivate_callsUnsubscribeAndClearsExternalId() {
        WorkflowDefinition definition = subscribeDefinition();
        TriggerRegistration registration = registration("reg-1", "vendor-sub-99", "fp-1");

        when(definitionRepository.findById("def-1")).thenReturn(Optional.of(definition));
        when(webhookUrlBuilder.buildCallbackUrl("def-1"))
                .thenReturn("https://api.example.com/rest/webhook-events/def-1");
        when(httpExecutor.execute(any())).thenReturn(PollHttpResult.builder()
                .success(true)
                .statusCode(200)
                .durationMs(30L)
                .build());
        when(registrationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(webhookLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.onDeactivate(registration);

        verify(httpExecutor).execute(any());
        assertNull(registration.getExternalSubscriptionId());
        assertNull(registration.getConfigFingerprint());

        ArgumentCaptor<TriggerWebhookLog> logCaptor = ArgumentCaptor.forClass(TriggerWebhookLog.class);
        verify(webhookLogRepository).save(logCaptor.capture());
        assertEquals(TriggerWebhookEventType.UNSUBSCRIBE, logCaptor.getValue().getEventType());
    }

    private WorkflowDefinition subscribeDefinition() {
        WorkflowDefinition definition = new WorkflowDefinition();
        definition.setId("def-1");
        definition.setTrigger(TriggerConfig.builder()
                .type(TriggerType.WEBHOOK)
                .webhook(WebhookConfig.builder()
                        .deliveryMode(WebhookDeliveryMode.SUBSCRIBE)
                        .active(true)
                        .subscriptionIdPath("$.id")
                        .subscribeHttp(PollHttpConfig.builder()
                                .url("https://vendor.example.com/subscribe")
                                .method("POST")
                                .body("{\"callback\":\"{{callbackUrl}}\"}")
                                .build())
                        .unsubscribeHttp(PollHttpConfig.builder()
                                .url("https://vendor.example.com/unsubscribe/{{subscriptionId}}")
                                .method("DELETE")
                                .build())
                        .build())
                .build());
        return definition;
    }

    private TriggerRegistration registration(String id, String externalId, String fingerprint) {
        return TriggerRegistration.builder()
                .id(id)
                .workflowDefinitionId("def-1")
                .triggerType(TriggerType.WEBHOOK)
                .status(TriggerRegistrationStatus.ACTIVE)
                .externalSubscriptionId(externalId)
                .configFingerprint(fingerprint)
                .build();
    }
}
