package com.app.core.model;

import com.app.common.entity.WorkflowDefinition;
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
     * Active workflow definition for this run (routing, metadata, variables).
     */
    private transient WorkflowDefinition workflowDefinition;

    /**
     * Timestamp when execution started.
     */
    private Instant executionTime;

    /**
     * Factory method to create context from WorkflowExecution state.
     */
    public static ExecutionContext fromExecution(
            Map<String, VariableValue> triggerInputs,
            Map<String, Object> taskOutputs,
            String executionId,
            WorkflowDefinition workflowDefinition) {
        Map<String, VariableValue> workflowVariables = workflowDefinition != null && workflowDefinition.getVariables() != null
                ? workflowDefinition.getVariables()
                : new HashMap<>();
        return ExecutionContext.builder()
                .triggerInputs(triggerInputs != null ? triggerInputs : new HashMap<>())
                .workflowVariables(workflowVariables)
                .taskOutputs(taskOutputs != null ? taskOutputs : new HashMap<>())
                .workflowExecutionId(executionId)
                .executionTime(Instant.now())
                .workflowDefinition(workflowDefinition)
                .build();
    }

    /**
     * Next task in definition order, or null when {@code currentTaskId} is last or unknown.
     */
    public String getSequentialNextTaskId(String currentTaskId) {
        if (workflowDefinition == null || workflowDefinition.getTasks() == null || currentTaskId == null) {
            return null;
        }
        var tasks = workflowDefinition.getTasks();
        for (int i = 0; i < tasks.size() - 1; i++) {
            if (tasks.get(i).getTaskId().equals(currentTaskId)) {
                return tasks.get(i + 1).getTaskId();
            }
        }
        return null;
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

    /**
     * Consolidates all available variable sources into a single structured map.
     * This provides a unified context for script engines and expression evaluators.
     *
     * @return Map containing all resolved variable values grouped by their source.
     */
    public Map<String, Object> getAllVariables() {
        Map<String, Object> data = new HashMap<>();

        // 1. Trigger inputs ($input)
        Map<String, Object> inputParams = new HashMap<>();
        if (triggerInputs != null) {
            triggerInputs.forEach((k, v) -> inputParams.put(k, v != null ? v.getValue() : null));
        }
        data.put("trigger", inputParams);

        // 2. Workflow-level variables ($variables)
        Map<String, Object> vars = new HashMap<>();
        if (workflowVariables != null) {
            workflowVariables.forEach((k, v) -> vars.put(k, v != null ? v.getValue() : null));
        }
        data.put("variables", vars);

        // 3. Task outputs ($tasks)
        data.put("tasks", taskOutputs != null ? new HashMap<>(taskOutputs) : new HashMap<>());

        // 4. Global environment variables ($env)
        if (environmentVariables != null && !environmentVariables.isEmpty()) {
            data.put("env", new HashMap<>(environmentVariables));
        }

        // 5. Loop variables ($loop)
        if (loopVariables != null && !loopVariables.isEmpty()) {
            data.put("loop", new HashMap<>(loopVariables));
        }

        // 6. Branch context context metadata
        if (branchId != null) {
            data.put("branch", Map.of(
                    "id", branchId,
                    "name", branchName != null ? branchName : "unknown"));
        }

        return data;
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
                .workflowDefinition(parent.getWorkflowDefinition())
                .branchId(branchId)
                .branchName(branchName)
                .parentContext(parent)
                .build();
    }
}
