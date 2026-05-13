package com.app.common.message;

import java.time.Instant;

/**
 * Message published when a workflow execution is triggered asynchronously.
 * Consumed by the core engine's message consumer to start the workflow.
 *
 * @param executionId            The pre-created execution record ID.
 * @param workflowDefinitionId   The workflow definition to execute.
 * @param timestamp              When the trigger was requested.
 */
public record WorkflowTriggerMessage(
        String executionId,
        String workflowDefinitionId,
        Instant timestamp
) {
}
