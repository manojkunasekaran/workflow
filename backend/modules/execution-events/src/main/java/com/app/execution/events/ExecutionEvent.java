package com.app.execution.events;

import java.time.Instant;

/**
 * Broadcast when workflow execution state changes (Core → API → SSE).
 */
public record ExecutionEvent(
        String executionId,
        String status,
        String currentTaskId,
        Instant timestamp) {

    public static ExecutionEvent of(String executionId, String status, String currentTaskId) {
        return new ExecutionEvent(executionId, status, currentTaskId, Instant.now());
    }
}
