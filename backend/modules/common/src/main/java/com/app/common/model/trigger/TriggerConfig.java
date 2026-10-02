package com.app.common.model.trigger;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Top-level trigger configuration for a workflow definition.
 * Determines how and when a workflow execution is created.
 *
 * <p>Stored as part of {@link com.app.common.entity.WorkflowDefinition}.
 * The workflow engine does NOT interpret triggers — they are used by the
 * API layer (webhooks) and the scheduler service (cron) to decide when
 * to call {@code WorkflowExecutionService.triggerExecution()}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TriggerConfig {

    /** The type of trigger. Defaults to MANUAL if null. */
    @Builder.Default
    private TriggerType type = TriggerType.MANUAL;

    /** Webhook-specific config. Only relevant when type = WEBHOOK. */
    private WebhookConfig webhook;

    /** Schedule-specific config. Only relevant when type = SCHEDULE. */
    private ScheduleConfig schedule;

    /** Poll-specific config. Only relevant when type = POLL. */
    private PollConfig poll;

    /** MCP server trigger config. Only relevant when type = MCP. */
    private McpTriggerConfig mcp;
}

