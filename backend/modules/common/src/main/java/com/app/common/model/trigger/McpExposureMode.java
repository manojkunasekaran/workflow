package com.app.common.model.trigger;

/**
 * Controls which MCP server HTTP endpoints are exposed for an organization.
 */
public enum McpExposureMode {
    /** Single global endpoint listing all tools. */
    GLOBAL,
    /** Per-workflow endpoint paths only. */
    PER_WORKFLOW,
    /** Both global and per-workflow endpoints. */
    BOTH
}
