package com.app.common.model.task.execution;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class TaskExecutionResult {
    public enum Status {
        COMPLETED,
        FAILED,
        SKIPPED,
        BRANCHED, // Indicates parallel execution was spawned
        PAUSED // Workflow paused, waiting for external input (e.g., human task)
    }

    private Status status;
    private String nextTaskId;
    private String errorMessage;

    // Task-specific execution audit trail (e.g., HttpTaskExecutionData)
    private TaskExecutionData executionData;

    /**
     * Structured output for downstream task reference.
     * Stored in WorkflowExecution.taskOutputs and accessible via $tasks.taskId
     * expressions.
     * Example for HTTP task: {"statusCode": 200, "body": {...}, "headers": {...}}
     */
    private Map<String, Object> output;

    /**
     * Branch execution IDs for tracking parallel branches (used by BRANCH task).
     */
    private List<String> parallelBranchIds;
}
