package com.app.common.model.task.execution;

import java.util.Map;

/**
 * Base interface for task-specific execution data.
 * Each task type (HTTP, Script, Conditional, etc.) will have its own
 * implementation.
 */
public interface TaskExecutionData {

    /**
     * Returns the task type identifier (e.g., "HTTP_TASK", "SCRIPT_TASK").
     */
    String getTaskType();

    /**
     * Converts execution data into an output map for downstream variable
     * resolution.
     * This map is stored in the execution context under the task's ID,
     * allowing downstream tasks to reference values via {{$tasks.taskId.field}}.
     *
     * @return Map of output key-value pairs
     */
    Map<String, Object> toOutputMap();
}
