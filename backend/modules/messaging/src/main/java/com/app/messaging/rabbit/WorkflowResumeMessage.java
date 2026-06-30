package com.app.messaging.rabbit;

import java.time.Instant;
import java.util.Map;

public record WorkflowResumeMessage(
        String executionId,
        Map<String, Object> taskOutputs,
        Instant timestamp
) {
}
