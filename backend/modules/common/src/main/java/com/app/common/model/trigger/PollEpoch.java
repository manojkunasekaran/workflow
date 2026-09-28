package com.app.common.model.trigger;

/**
 * Defines the starting point for change detection on first poll.
 */
public enum PollEpoch {
    /** Establish baseline from the first poll onward; ignore prior data. */
    NOW,
    /** Treat all items on first poll as already seen (no initial triggers). */
    ALL,
    /** Only consider items from {@link PollConfig#getEpochDate()} onward. */
    FROM_DATE
}
