package com.app.common.entity;

import com.app.common.constant.CollectionNames;
import com.app.common.constant.TriggerWebhookEventType;
import com.app.common.model.base.Auditable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Audit record for webhook registration lifecycle and inbound delivery attempts.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = CollectionNames.TRIGGER_WEBHOOK_LOGS)
public class TriggerWebhookLog extends Auditable {

    @Id
    private String id;

    private String registrationId;
    private String workflowDefinitionId;
    private TriggerWebhookEventType eventType;
    private Instant timestamp;
    private Long durationMs;
    private boolean success;
    private String error;
    private boolean triggeredExecution;
}
