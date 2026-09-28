package com.app.common.constant;

/**
 * Lifecycle status of an active trigger registration (poll, future webhook subscribe, etc.).
 */
public enum TriggerRegistrationStatus {
    ACTIVE,
    PAUSED,
    ERROR,
    DISABLED
}
