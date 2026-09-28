package com.app.api.schedule;

import com.app.common.model.trigger.PollScheduleConfig;
import com.app.common.model.trigger.PollScheduleMode;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Converts {@link PollScheduleConfig} to a normalized {@link TriggerScheduleSpec}.
 * Prefers cron conversion for fixed intervals; falls back to fixed-rate when needed.
 */
@Component
public class PollScheduleNormalizer {

    public TriggerScheduleSpec normalize(PollScheduleConfig schedule) {
        if (schedule == null) {
            throw new IllegalArgumentException("Poll schedule configuration is required");
        }

        if (schedule.getMode() == PollScheduleMode.CRON) {
            String cron = schedule.getCronExpression();
            if (cron == null || cron.isBlank()) {
                throw new IllegalArgumentException("Cron expression is required for CRON poll schedule mode");
            }
            String timezone = schedule.getTimezone() != null ? schedule.getTimezone() : "UTC";
            return new TriggerScheduleSpec.CronScheduleSpec(cron, timezone);
        }

        Long intervalSeconds = schedule.getIntervalSeconds();
        if (intervalSeconds == null || intervalSeconds <= 0) {
            throw new IllegalArgumentException("intervalSeconds must be a positive value for FIXED_INTERVAL mode");
        }

        return IntervalToCronConverter.toCron(intervalSeconds)
                .<TriggerScheduleSpec>map(cron -> new TriggerScheduleSpec.CronScheduleSpec(cron, "UTC"))
                .orElseGet(() -> new TriggerScheduleSpec.FixedRateScheduleSpec(
                        Duration.ofSeconds(intervalSeconds)));
    }
}
