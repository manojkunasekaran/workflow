package com.app.common.message;

import java.time.Instant;
import java.util.Map;

/**
 * Message published when a paused workflow needs to be resumed
 * (e.g., after a human task response).
 *
 * @param executionId  The paused execution to resume.
 * @param taskOutputs  Outputs from the completed task to merge into execution context.
 * @param timestamp    When the resume was requested.
 */
public record WorkflowResumeMessage(
        String executionId,
        Map<String, Object> taskOutputs,
        Instant timestamp
) {
}
