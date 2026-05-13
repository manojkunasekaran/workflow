package com.app.common.constant;

/**
 * Status of an individual Task Execution.
 */
public enum TaskExecutionStatus {
    PENDING,
    RUNNING,
    PAUSED,
    COMPLETED,
    FAILED,
    BRANCHED,
    SKIPPED
}
