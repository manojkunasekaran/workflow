package com.app.common.model.trigger;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Schedule configuration for a poll trigger.
 * Supports fixed interval or cron expression with timezone.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PollScheduleConfig {

    @Builder.Default
    private PollScheduleMode mode = PollScheduleMode.FIXED_INTERVAL;

    /** Canonical interval in seconds when mode = FIXED_INTERVAL. */
    private Long intervalSeconds;

    /** 6-field Spring cron expression when mode = CRON. */
    private String cronExpression;

    /** IANA timezone ID for cron mode. Defaults to UTC. */
    @Builder.Default
    private String timezone = "UTC";
}
