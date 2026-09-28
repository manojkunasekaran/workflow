package com.app.common.model.trigger;

/**
 * Defines how a workflow can be triggered.
 */
public enum TriggerType {
    /** User clicks "Run" or calls POST /executions/{id}. */
    MANUAL,
    /** External systems POST to a generated webhook URL (passive or app-managed subscribe). */
    WEBHOOK,
    /** Platform auto-triggers on a cron schedule. */
    SCHEDULE,
    /** Platform polls an HTTP endpoint on a schedule and triggers on data changes. */
    POLL
}
