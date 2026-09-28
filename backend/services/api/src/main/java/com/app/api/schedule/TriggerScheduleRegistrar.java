package com.app.api.schedule;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.TimeZone;
import java.util.concurrent.ScheduledFuture;

/**
 * Shared register/cancel helpers for {@link ScheduledFuture} maps backed by a {@link TaskScheduler}.
 */
@Slf4j
@Component
public class TriggerScheduleRegistrar {

    public ScheduledFuture<?> registerCron(
            TaskScheduler taskScheduler,
            String cronExpression,
            String timezone,
            Runnable task) {
        String tz = timezone != null && !timezone.isBlank() ? timezone : "UTC";
        CronTrigger cronTrigger = new CronTrigger(cronExpression, TimeZone.getTimeZone(tz));
        return taskScheduler.schedule(task, cronTrigger);
    }

    public ScheduledFuture<?> registerFixedRate(
            TaskScheduler taskScheduler,
            Duration interval,
            Runnable task) {
        return taskScheduler.scheduleAtFixedRate(task, interval);
    }

    public boolean cancel(Map<String, ScheduledFuture<?>> activeSchedules, String key) {
        ScheduledFuture<?> existing = activeSchedules.remove(key);
        if (existing != null) {
            existing.cancel(false);
            log.debug("Cancelled scheduled task for key {}", key);
            return true;
        }
        return false;
    }
}
