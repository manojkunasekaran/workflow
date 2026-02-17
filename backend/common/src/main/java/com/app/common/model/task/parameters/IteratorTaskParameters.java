package com.app.common.model.task.parameters;

import com.app.common.model.task.WorkflowTask;
import lombok.Data;

import java.util.List;

/**
 * Parameters for Iterator Task (Loop Task).
 * Supports iteration over Arrays, Objects, or Numbers.
 */
@Data
public class IteratorTaskParameters implements TaskParameters {

    /**
     * The collection/range to iterate over.
     * Supports:
     * - String expression (e.g., "{{$input.items}}")
     * - List/Array literal (e.g., ["a", "b", "c"])
     * - Map/Object literal (e.g., {"key1": "value1"})
     * - Number literal (e.g., 5 to iterate 0-4)
     */
    private Object loopOver;

    /**
     * Sub-tasks to execute for each iteration.
     */
    private List<WorkflowTask> actions;
}
