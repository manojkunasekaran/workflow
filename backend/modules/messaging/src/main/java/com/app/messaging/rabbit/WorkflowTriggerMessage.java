package com.app.messaging.rabbit;

import java.time.Instant;

public record WorkflowTriggerMessage(
        String executionId,
        String workflowDefinitionId,
        Instant timestamp
) {
}
