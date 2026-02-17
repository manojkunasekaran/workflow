package com.app.core.model;

import com.app.common.model.variable.VariableValue;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Unified execution context containing all variable sources.
 * Used by VariableResolver to resolve expressions like {{$tasks.taskId.field}}.
 * 
 * Variable Sources:
 * - $input: Trigger inputs provided when workflow starts
 * - $variables: Workflow-level variables defined in WorkflowDefinition
 * - $tasks.<taskId>: Outputs from previously executed tasks
 * - $env: Global environment variables (future)
 */
@Data
@Builder
public class ExecutionContext {

    /**
     * Trigger inputs provided when the workflow execution started.
     * Access via: $input.fieldName
     */
    @Builder.Default
    private Map<String, VariableValue> triggerInputs = new HashMap<>();

    /**
     * Workflow-level variables defined in WorkflowDefinition.
     * Access via: $variables.variableName
     */
    @Builder.Default
    private Map<String, VariableValue> workflowVariables = new HashMap<>();

    /**
     * Outputs from previously executed tasks, keyed by taskId.
     * Access via: $tasks.taskId.path.to.field
     */
    @Builder.Default
    private Map<String, Object> taskOutputs = new HashMap<>();

    /**
     * Global environment variables (secrets, config).
     * Access via: $env.variableName
     */
    @Builder.Default
    private Map<String, Object> environmentVariables = new HashMap<>();

    /**
     * Loop-specific variables for iterator tasks.
     * Access via: $loop.item, $loop.index, $loop.count, $loop.key, $loop.value
     */
    @Builder.Default
    private Map<String, Object> loopVariables = new HashMap<>();

    /**
     * Current workflow execution ID for logging/debugging.
     */
    private String workflowExecutionId;

    /**
     * Timestamp when execution started.
     */
    private Instant executionTime;

    /**
     * Factory method to create context from WorkflowExecution state.
     */
    public static ExecutionContext fromExecution(
            Map<String, VariableValue> triggerInputs,
            Map<String, VariableValue> workflowVariables,
            Map<String, Object> taskOutputs,
            String executionId) {
        return ExecutionContext.builder()
                .triggerInputs(triggerInputs != null ? triggerInputs : new HashMap<>())
                .workflowVariables(workflowVariables != null ? workflowVariables : new HashMap<>())
                .taskOutputs(taskOutputs != null ? taskOutputs : new HashMap<>())
                .workflowExecutionId(executionId)
                .executionTime(Instant.now())
                .build();
    }

    /**
     * Update loop context with current iteration data.
     * 
     * @param item  Current item (for array iteration)
     * @param index Current iteration index (zero-based)
     * @param count Total number of iterations
     */
    public void updateLoopContext(Object item, int index, int count) {
        this.loopVariables.put("item", item);
        this.loopVariables.put("index", index);
        this.loopVariables.put("count", count);
    }

    /**
     * Update loop context for object/map iteration.
     * 
     * @param key   Current key
     * @param value Current value
     * @param index Current iteration index
     * @param count Total number of iterations
     */
    public void updateLoopContextForObject(String key, Object value, int index, int count) {
        this.loopVariables.put("key", key);
        this.loopVariables.put("value", value);
        this.loopVariables.put("index", index);
        this.loopVariables.put("count", count);
    }

    /**
     * Clear loop context after iteration completes.
     */
    public void clearLoopContext() {
        this.loopVariables.clear();
    }

    // ── Branch context support ──

    /**
     * Branch ID (null for main execution, UUID for parallel branches).
     */
    private String branchId;

    /**
     * Human-readable branch name (null for main execution).
     */
    private String branchName;

    /**
     * Reference to parent context (for branch merging at JOIN).
     */
    @Builder.Default
    private transient ExecutionContext parentContext = null;

    /**
     * Create an isolated branch context from a parent context.
     * The branch gets its own copies of task outputs but shares
     * read-only access to trigger inputs and workflow variables.
     *
     * @param parent     The parent (main) execution context
     * @param branchId   Unique branch identifier
     * @param branchName Human-readable branch name
     * @return A new isolated ExecutionContext for the branch
     */
    public static ExecutionContext createBranch(ExecutionContext parent, String branchId, String branchName) {
        return ExecutionContext.builder()
                .triggerInputs(parent.getTriggerInputs())
                .workflowVariables(parent.getWorkflowVariables())
                .taskOutputs(new HashMap<>(parent.getTaskOutputs())) // isolated copy
                .environmentVariables(parent.getEnvironmentVariables())
                .loopVariables(new HashMap<>())
                .workflowExecutionId(parent.getWorkflowExecutionId())
                .executionTime(parent.getExecutionTime())
                .branchId(branchId)
                .branchName(branchName)
                .parentContext(parent)
                .build();
    }
}
