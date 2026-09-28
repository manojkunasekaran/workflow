package com.app.common.model.trigger;

/**
 * How a poll trigger's recurring schedule is expressed.
 */
public enum PollScheduleMode {
    /** Fixed interval in seconds (e.g. every 5 minutes). */
    FIXED_INTERVAL,
    /** Cron expression with optional timezone. */
    CRON
}
