package com.app.common.model.task.parameters;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Parameters for WAIT task type.
 * Delays workflow execution for a specified duration.
 * Supports variable substitution for the duration value.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WaitTaskParameters implements TaskParameters {

    public static final long MIN_DURATION_MS = 1_000L;

    /**
     * Duration to wait in milliseconds.
     * Supports variable substitution (e.g., $tasks.task1.delay or $vars.waitTime).
     */
    private Long duration;
}
