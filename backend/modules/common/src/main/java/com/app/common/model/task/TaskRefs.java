package com.app.common.model.task;

/**
 * Normalization for optional task wiring references stored in workflow parameters.
 * Blank strings from the studio are treated as unset ({@code null}).
 */
public final class TaskRefs {

    private TaskRefs() {
    }

    public static String normalize(String taskRef) {
        if (taskRef == null) {
            return null;
        }
        String trimmed = taskRef.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
