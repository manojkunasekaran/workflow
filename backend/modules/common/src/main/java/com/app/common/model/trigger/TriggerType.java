package com.app.common.model.trigger;

/**
 * Defines how a workflow can be triggered.
 */
public enum TriggerType {
    /** User clicks "Run" or calls POST /executions/{id}. */
    MANUAL,
    /** External systems POST to a generated webhook URL. */
    WEBHOOK,
    /** Platform auto-triggers on a cron schedule. */
    SCHEDULE
}
