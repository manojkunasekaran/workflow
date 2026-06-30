package com.app.common.constant;

/**
 * Defines how a workflow execution was triggered.
 *
 * <ul>
 *   <li>{@code SYNC}  — Executed synchronously; the caller waits for engine acceptance.</li>
 *   <li>{@code ASYNC} — Queued for asynchronous processing; the caller receives an immediate response.</li>
 * </ul>
 */
public enum ExecutionType {
    SYNC,
    ASYNC
}
