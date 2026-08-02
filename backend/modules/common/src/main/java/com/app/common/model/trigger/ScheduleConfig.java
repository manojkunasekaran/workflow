package com.app.common.model.trigger;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Configuration for a scheduled (cron) trigger.
 * When active, the platform automatically triggers the workflow
 * at the times described by the cron expression.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleConfig {

    /** Standard cron expression (6-field Spring format), e.g. "0 0/15 * * * *". */
    private String cronExpression;

    /** IANA timezone ID, e.g. "Asia/Kolkata". Defaults to UTC if not set. */
    @Builder.Default
    private String timezone = "UTC";

    /** Whether the schedule is currently active. */
    @Builder.Default
    private boolean active = true;
}
