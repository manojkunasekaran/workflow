package com.app.api.schedule;

import java.time.Duration;

/**
 * Normalized schedule specification for trigger registration.
 * Either cron-based or fixed-rate; used by SCHEDULE and POLL triggers.
 */
public sealed interface TriggerScheduleSpec permits TriggerScheduleSpec.CronScheduleSpec,
        TriggerScheduleSpec.FixedRateScheduleSpec {

    record CronScheduleSpec(String cronExpression, String timezone) implements TriggerScheduleSpec {
    }

    record FixedRateScheduleSpec(Duration interval) implements TriggerScheduleSpec {
    }
}
