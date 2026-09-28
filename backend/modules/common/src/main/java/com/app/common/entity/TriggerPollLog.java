package com.app.common.entity;

import com.app.common.constant.CollectionNames;
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
 * Audit record for a single poll execution attempt.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = CollectionNames.TRIGGER_POLL_LOGS)
public class TriggerPollLog extends Auditable {

    @Id
    private String id;

    private String registrationId;
    private String workflowDefinitionId;
    private Instant polledAt;
    private Long durationMs;
    private Integer itemsFetched;
    private Integer itemsNew;
    private Integer itemsSkipped;
    private Integer itemsUpdated;
    private boolean triggeredExecution;
    private String error;

    /** True when this log entry records a manual reprocess run. */
    @Builder.Default
    private boolean reprocess = false;

    /** Item keys reprocessed, when applicable. */
    private java.util.List<String> reprocessedItemKeys;
}
