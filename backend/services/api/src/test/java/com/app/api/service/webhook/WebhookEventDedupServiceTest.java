package com.app.api.service.webhook;

import com.app.api.config.properties.WorkflowApiProperties;
import com.app.common.constant.TriggerRegistrationStatus;
import com.app.common.entity.TriggerRegistration;
import com.app.common.entity.TriggerWebhookEventDedupe;
import com.app.common.model.trigger.WebhookInboundConfig;
import com.app.persistence.repository.TriggerWebhookEventDedupeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebhookEventDedupServiceTest {

    @Mock
    private TriggerWebhookEventDedupeRepository dedupeRepository;

    private WebhookEventDedupService dedupService;

    @BeforeEach
    void setUp() {
        WorkflowApiProperties properties = new WorkflowApiProperties();
        properties.getWebhook().setDedupTtlDays(7);
        dedupService = new WebhookEventDedupService(dedupeRepository, properties);
    }

    @Test
    void extractEventId_readsConfiguredJsonPath() {
        Map<String, Object> body = new HashMap<>();
        body.put("data", Map.of("id", "evt-123"));

        WebhookInboundConfig inbound = WebhookInboundConfig.builder()
                .ignoreDuplicates(true)
                .eventIdPath("$.data.id")
                .build();

        Optional<String> eventId = dedupService.extractEventId(body, inbound);

        assertTrue(eventId.isPresent());
        assertEquals("evt-123", eventId.get());
    }

    @Test
    void isDuplicate_returnsTrueWhenRecordExists() {
        TriggerRegistration registration = TriggerRegistration.builder()
                .id("reg-1")
                .status(TriggerRegistrationStatus.ACTIVE)
                .build();

        when(dedupeRepository.findByRegistrationIdAndEventId("reg-1", "evt-1"))
                .thenReturn(Optional.of(TriggerWebhookEventDedupe.builder().eventId("evt-1").build()));

        assertTrue(dedupService.isDuplicate(registration, "evt-1"));
    }

    @Test
    void recordEvent_persistsDedupeRecord() {
        TriggerRegistration registration = TriggerRegistration.builder()
                .id("reg-1")
                .status(TriggerRegistrationStatus.ACTIVE)
                .build();

        dedupService.recordEvent(registration, "evt-99");

        ArgumentCaptor<TriggerWebhookEventDedupe> captor = ArgumentCaptor.forClass(TriggerWebhookEventDedupe.class);
        verify(dedupeRepository).deleteByRegistrationIdAndSeenAtBefore(any(), any(Instant.class));
        verify(dedupeRepository).save(captor.capture());

        TriggerWebhookEventDedupe saved = captor.getValue();
        assertEquals("reg-1", saved.getRegistrationId());
        assertEquals("evt-99", saved.getEventId());
        assertTrue(saved.getSeenAt() != null);
    }

    @Test
    void extractEventId_skipsWhenIgnoreDuplicatesDisabled() {
        WebhookInboundConfig inbound = WebhookInboundConfig.builder()
                .ignoreDuplicates(false)
                .eventIdPath("$.id")
                .build();

        assertFalse(dedupService.extractEventId(Map.of("id", "evt-1"), inbound).isPresent());
        verify(dedupeRepository, never()).save(any());
    }
}
