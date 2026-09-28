package com.app.api.service.webhook;

import com.app.api.config.properties.WorkflowApiProperties;
import com.app.common.entity.TriggerRegistration;
import com.app.common.entity.TriggerWebhookEventDedupe;
import com.app.common.model.trigger.WebhookInboundConfig;
import com.app.common.util.DataTransformUtils;
import com.app.persistence.repository.TriggerWebhookEventDedupeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

/**
 * Deduplicates inbound webhook events by stable event id.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookEventDedupService {

    private final TriggerWebhookEventDedupeRepository dedupeRepository;
    private final WorkflowApiProperties apiProperties;

    public Optional<String> extractEventId(Object parsedBody, WebhookInboundConfig inbound) {
        if (inbound == null || !inbound.isIgnoreDuplicates()) {
            return Optional.empty();
        }
        String eventIdPath = inbound.getEventIdPath();
        if (eventIdPath == null || eventIdPath.isBlank()) {
            return Optional.empty();
        }
        Object extracted = DataTransformUtils.extractJsonPath(parsedBody, eventIdPath);
        if (extracted == null) {
            return Optional.empty();
        }
        String eventId = extracted.toString();
        if (eventId.isBlank()) {
            return Optional.empty();
        }
        return Optional.of(eventId);
    }

    public boolean isDuplicate(TriggerRegistration registration, String eventId) {
        if (eventId == null || eventId.isBlank()) {
            return false;
        }
        return dedupeRepository
                .findByRegistrationIdAndEventId(registration.getId(), eventId)
                .isPresent();
    }

    public void recordEvent(TriggerRegistration registration, String eventId) {
        if (eventId == null || eventId.isBlank()) {
            return;
        }

        purgeExpiredRecords(registration.getId());

        TriggerWebhookEventDedupe record = TriggerWebhookEventDedupe.builder()
                .id(UUID.randomUUID().toString())
                .registrationId(registration.getId())
                .eventId(eventId)
                .seenAt(Instant.now())
                .build();
        dedupeRepository.save(record);
    }

    private void purgeExpiredRecords(String registrationId) {
        int ttlDays = apiProperties.getWebhook().getDedupTtlDays();
        if (ttlDays <= 0) {
            return;
        }
        Instant cutoff = Instant.now().minus(ttlDays, ChronoUnit.DAYS);
        dedupeRepository.deleteByRegistrationIdAndSeenAtBefore(registrationId, cutoff);
    }
}
