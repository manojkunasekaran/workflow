package com.app.common.entity;

import com.app.common.constant.CollectionNames;
import com.app.common.model.base.Auditable;
import com.app.common.model.trigger.PollEventSemantics;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Durable change-detection state for a poll trigger registration.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = CollectionNames.TRIGGER_POLL_STATES)
public class TriggerPollState extends Auditable {

    @Id
    private String id;

    private String registrationId;
    private PollEventSemantics semantics;
    private String lastResponseHash;
    private String lastEtag;
    private Instant cursorTimestamp;

    @Builder.Default
    private List<SeenKey> seenKeys = new ArrayList<>();

    @Builder.Default
    private boolean baselineEstablished = false;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeenKey {
        private String key;
        private Instant firstSeenAt;
    }
}
