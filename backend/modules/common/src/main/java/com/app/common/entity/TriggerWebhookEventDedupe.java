package com.app.common.entity;

import com.app.common.constant.CollectionNames;
import com.app.common.model.base.Auditable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Tracks seen inbound webhook event ids for deduplication.
 *
 * <p>TTL is driven by {@code seenAt} via {@code @Indexed(expireAfterSeconds = ...)}.
 * Actual TTL duration is configured at runtime (see workflow.api.webhook.dedup-ttl-days).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = CollectionNames.TRIGGER_WEBHOOK_EVENT_DEDUPE)
public class TriggerWebhookEventDedupe extends Auditable {

    @Id
    private String id;

    private String registrationId;

    private String eventId;

    @Indexed
    private Instant seenAt;
}
