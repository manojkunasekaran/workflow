package com.app.common.model.trigger;

/**
 * Defines what kind of change in polled data should trigger workflow execution.
 */
public enum PollEventSemantics {
    /** Trigger when items not seen before appear. */
    NEW_ITEMS,
    /** Trigger when existing items change (per update key). */
    UPDATED,
    /** Trigger on new items or updates. */
    NEW_OR_UPDATED,
    /** Trigger when the normalized full response body hash changes. */
    RESPONSE_CHANGED
}
