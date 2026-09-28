package com.app.common.model.trigger;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Configuration for a poll trigger.
 * When active, the platform periodically fetches an HTTP endpoint
 * and triggers the workflow when configured change semantics are met.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PollConfig {

    @Builder.Default
    private boolean active = true;

    private PollScheduleConfig schedule;

    @Builder.Default
    private PollEventSemantics semantics = PollEventSemantics.NEW_ITEMS;

    @Builder.Default
    private PollEpoch epoch = PollEpoch.NOW;

    /** ISO-8601 instant used when epoch = FROM_DATE. */
    private String epochDate;

    @Builder.Default
    private PollRunMode runMode = PollRunMode.PER_ITEM;

    private PollHttpConfig http;

    private ChangeDetectionConfig detection;

    @Builder.Default
    private List<PollFilter> filters = new ArrayList<>();

    /** Connector preset selection — studio metadata only. */
    private String connectorId;
    private String connectorTriggerId;
    @Builder.Default
    private Map<String, String> connectorInputs = new HashMap<>();
}
