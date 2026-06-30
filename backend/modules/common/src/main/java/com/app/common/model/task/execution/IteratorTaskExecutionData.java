package com.app.common.model.task.execution;

import lombok.Builder;
import lombok.Data;

import com.app.common.model.task.TaskType;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Execution data for Iterator Task.
 * Stores iteration statistics and aggregated results.
 */
@Data
@Builder
public class IteratorTaskExecutionData implements TaskExecutionData {

    /**
     * Total number of iterations executed.
     */
    private int totalIterations;

    /**
     * Number of successful iterations.
     */
    private int successfulIterations;

    /**
     * Number of failed iterations.
     */
    private int failedIterations;

    /**
     * Aggregated results from all iterations.
     * Each map represents the task outputs for one iteration.
     */
    private List<Map<String, Object>> results;

    @Override
    public String getTaskType() {
        return TaskType.ITERATOR_TASK.name();
    }

    @Override
    public Map<String, Object> toOutputMap() {
        return Collections.singletonMap("results", results);
    }
}
