package com.app.common.model.trigger;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Configuration for an MCP server trigger.
 * Tool input schema is derived from {@link com.app.common.entity.WorkflowDefinition#inputs}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class McpTriggerConfig {

    /** Unique tool name exposed to MCP clients within the organization. */
    private String toolName;

    /** Optional description shown in tool listings. */
    private String description;

    @Builder.Default
    private McpResponseMode responseMode = McpResponseMode.EXECUTION_ID;

    /** Task id whose output is returned when {@code responseMode = TASK_OUTPUT}. */
    private String responseTaskId;

    /** Max seconds to wait for sync completion in {@code TASK_OUTPUT} mode. */
    @Builder.Default
    private Integer waitTimeoutSeconds = 300;

    @Builder.Default
    private boolean active = true;
}
