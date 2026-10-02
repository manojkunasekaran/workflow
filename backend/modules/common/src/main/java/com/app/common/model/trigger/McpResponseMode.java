package com.app.common.model.trigger;

/**
 * How the MCP server responds after invoking a workflow-backed tool.
 */
public enum McpResponseMode {
    /** Wait for execution and return output of {@code responseTaskId}. */
    TASK_OUTPUT,
    /** Return the execution id immediately without waiting. */
    EXECUTION_ID
}
