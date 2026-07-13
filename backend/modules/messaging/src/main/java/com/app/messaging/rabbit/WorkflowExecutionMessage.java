package com.app.messaging.rabbit;

import java.time.Instant;

public record WorkflowExecutionMessage(
        String executionId,
        Instant timestamp
) {
}
