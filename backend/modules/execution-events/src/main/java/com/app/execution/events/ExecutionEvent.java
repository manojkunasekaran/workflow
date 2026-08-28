package com.app.execution.events;

import java.time.Instant;

/**
 * Broadcast when workflow execution state changes (Core → API → SSE).
 */
public record ExecutionEvent(
        String executionId,
        String status,
        String currentTaskId,
        Instant timestamp,
        java.util.Map<String, Object> payload) {

    public static ExecutionEvent of(String executionId, String status, String currentTaskId) {
        return new ExecutionEvent(executionId, status, currentTaskId, Instant.now(), null);
    }

    public static ExecutionEvent chunk(String executionId, String currentTaskId, String chunkText) {
        return new ExecutionEvent(executionId, "STREAMING", currentTaskId, Instant.now(), java.util.Map.of("chunk", chunkText));
    }
}
