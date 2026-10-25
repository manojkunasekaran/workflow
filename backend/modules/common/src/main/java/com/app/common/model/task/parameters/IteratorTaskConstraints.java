package com.app.common.model.task.parameters;

import com.app.common.model.task.TaskType;

import java.util.Set;

/** Shared iterator (for-loop) limits — studio and engine must stay aligned. */
public final class IteratorTaskConstraints {

    private IteratorTaskConstraints() {
    }

    public static final int MAX_ITERATIONS = 1_000;

    public static final Set<TaskType> ALLOWED_NESTED_ACTION_TYPES = Set.of(
            TaskType.HTTP_TASK,
            TaskType.SCRIPT_TASK,
            TaskType.WAIT,
            TaskType.DATA_TRANSFORM);
}
