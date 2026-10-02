package com.app.common.entity;

import com.app.common.constant.CollectionNames;
import com.app.common.constant.TriggerRegistrationStatus;
import com.app.common.model.base.Auditable;
import com.app.common.model.trigger.TriggerType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Runtime registration for an active trigger on a workflow definition.
 * Created when a poll or webhook trigger is activated.
 *
 * Inbound webhooks are addressed by {@code workflowDefinitionId} in the public URL.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = CollectionNames.TRIGGER_REGISTRATIONS)
public class TriggerRegistration extends Auditable {

    @Id
    private String id;

    private String workflowDefinitionId;
    private TriggerType triggerType;

    @Builder.Default
    private TriggerRegistrationStatus status = TriggerRegistrationStatus.ACTIVE;

    private Instant activatedAt;
    private Instant lastPollAt;
    private Instant lastSuccessAt;
    private Instant lastErrorAt;
    private String lastErrorMessage;

    @Builder.Default
    private int consecutiveFailures = 0;

    /** AES-GCM encrypted platform signing secret for inbound verification. */
    private String signingSecret;

    /** Vendor subscription id returned from subscribe HTTP (webhook subscribe mode only). */
    private String externalSubscriptionId;

    /** Hash of subscribe config; used to skip redundant vendor re-registration (Phase C). */
    private String configFingerprint;

    private Instant lastSubscribeAt;
    private Instant lastUnsubscribeAt;
    private Instant lastInboundAt;

    /** Registered MCP tool name (MCP triggers only). */
    private String mcpToolName;
}
