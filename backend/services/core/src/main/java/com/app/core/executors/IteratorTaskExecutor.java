package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.execution.IteratorTaskExecutionData;
import com.app.common.model.task.parameters.IteratorTaskParameters;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.core.model.ExecutionContext;
import com.app.core.service.TaskExecutor;
import com.app.core.service.VariableResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Executor for Iterator (Loop) tasks.
 * Supports iteration over Arrays, Objects, and Numbers.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class IteratorTaskExecutor implements TaskExecutor {

    private final VariableResolver variableResolver;
    private final List<TaskExecutor> taskExecutors; // For executing sub-tasks

    @Override
    public boolean canExecute(TaskType taskType) {
        return TaskType.ITERATOR_TASK == taskType;
    }

    @Override
    public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
        log.info("Executing Iterator Task: {}", task.getTaskId());

        if (!(task.getParameters() instanceof IteratorTaskParameters params)) {
            throw new IllegalArgumentException("Invalid parameters for Iterator Task");
        }

        try {
            // Resolve loopOver value
            Object loopOverValue = variableResolver.resolveValue(params.getLoopOver(), context);

            // Execute based on type
            IteratorTaskExecutionData executionData = executeIteration(loopOverValue, params, execution, context);

            return TaskExecutionResult.builder()
                    .status(executionData.getFailedIterations() > 0
                            ? TaskExecutionResult.Status.FAILED
                            : TaskExecutionResult.Status.COMPLETED)
                    .output(buildOutput(executionData))
                    .executionData(executionData)
                    .nextTaskId(resolveDoneNextTaskId(params))
                    .build();

        } catch (Exception e) {
            log.error("Iterator task execution failed: {}", e.getMessage(), e);
            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.FAILED)
                    .errorMessage(e.getMessage())
                    .build();
        } finally {
            context.clearLoopContext();
        }
    }

    private IteratorTaskExecutionData executeIteration(Object loopOverValue,
            IteratorTaskParameters params,
            WorkflowExecution execution,
            ExecutionContext context) {
        // Detect iteration type and execute accordingly
        if (loopOverValue instanceof List<?> list) {
            return executeArrayIteration(list, params, execution, context);
        } else if (loopOverValue instanceof Map<?, ?> map) {
            return executeObjectIteration(map, params, execution, context);
        } else if (loopOverValue instanceof Number number) {
            return executeNumberIteration(number.intValue(), params, execution, context);
        } else {
            throw new IllegalArgumentException("loopOver must be an Array, Object, or Number. Got: "
                    + (loopOverValue != null ? loopOverValue.getClass().getName() : "null"));
        }
    }

    private IteratorTaskExecutionData executeArrayIteration(List<?> items,
            IteratorTaskParameters params,
            WorkflowExecution execution,
            ExecutionContext context) {
        int totalIterations = items.size();
        int successCount = 0;
        int failCount = 0;
        List<Map<String, Object>> results = new ArrayList<>();

        log.info("Starting array iteration with {} items", totalIterations);

        for (int i = 0; i < items.size(); i++) {
            Object item = items.get(i);
            context.updateLoopContext(item, i, totalIterations);

            try {
                Map<String, Object> iterationResult = executeActions(params.getActions(), execution, context);
                results.add(iterationResult);
                successCount++;
            } catch (Exception e) {
                log.error("Iteration {} failed: {}", i, e.getMessage());
                failCount++;
                results.add(Collections.singletonMap("error", e.getMessage()));
            }
        }

        return IteratorTaskExecutionData.builder()
                .totalIterations(totalIterations)
                .successfulIterations(successCount)
                .failedIterations(failCount)
                .results(results)
                .build();
    }

    private IteratorTaskExecutionData executeObjectIteration(Map<?, ?> map,
            IteratorTaskParameters params,
            WorkflowExecution execution,
            ExecutionContext context) {
        int totalIterations = map.size();
        int successCount = 0;
        int failCount = 0;
        List<Map<String, Object>> results = new ArrayList<>();

        log.info("Starting object iteration with {} entries", totalIterations);

        int index = 0;
        for (Map.Entry<?, ?> entry : map.entrySet()) {
            String key = entry.getKey().toString();
            Object value = entry.getValue();
            context.updateLoopContextForObject(key, value, index, totalIterations);

            try {
                Map<String, Object> iterationResult = executeActions(params.getActions(), execution, context);
                results.add(iterationResult);
                successCount++;
            } catch (Exception e) {
                log.error("Iteration {} (key: {}) failed: {}", index, key, e.getMessage());
                failCount++;
                results.add(Collections.singletonMap("error", e.getMessage()));
            }
            index++;
        }

        return IteratorTaskExecutionData.builder()
                .totalIterations(totalIterations)
                .successfulIterations(successCount)
                .failedIterations(failCount)
                .results(results)
                .build();
    }

    private IteratorTaskExecutionData executeNumberIteration(int count,
            IteratorTaskParameters params,
            WorkflowExecution execution,
            ExecutionContext context) {
        int successCount = 0;
        int failCount = 0;
        List<Map<String, Object>> results = new ArrayList<>();

        log.info("Starting number iteration for {} times", count);

        for (int i = 0; i < count; i++) {
            context.updateLoopContext(i, i, count);

            try {
                Map<String, Object> iterationResult = executeActions(params.getActions(), execution, context);
                results.add(iterationResult);
                successCount++;
            } catch (Exception e) {
                log.error("Iteration {} failed: {}", i, e.getMessage());
                failCount++;
                results.add(Collections.singletonMap("error", e.getMessage()));
            }
        }

        return IteratorTaskExecutionData.builder()
                .totalIterations(count)
                .successfulIterations(successCount)
                .failedIterations(failCount)
                .results(results)
                .build();
    }

    /**
     * Execute the sub-tasks (actions) for a single iteration.
     */
    private Map<String, Object> executeActions(List<WorkflowTask> actions,
            WorkflowExecution execution,
            ExecutionContext context) {
        Map<String, Object> iterationOutputs = new HashMap<>();

        if (actions == null || actions.isEmpty()) {
            return iterationOutputs;
        }

        for (WorkflowTask action : actions) {
            TaskExecutor executor = findExecutor(action.getType());
            if (executor == null) {
                throw new IllegalStateException("No executor found for task type: " + action.getType());
            }

            TaskExecutionResult result = executor.execute(action, execution, context);

            if (result.getStatus() == TaskExecutionResult.Status.FAILED) {
                throw new RuntimeException("Sub-task failed: " + result.getErrorMessage());
            }

            // Store output for this action
            if (result.getOutput() != null) {
                iterationOutputs.put(action.getTaskId(), result.getOutput());
                // Also update context so subsequent actions can reference this output
                context.getTaskOutputs().put(action.getTaskId(), result.getOutput());
            }
        }

        return iterationOutputs;
    }

    private TaskExecutor findExecutor(TaskType taskType) {
        return taskExecutors.stream()
                .filter(executor -> executor.canExecute(taskType))
                .findFirst()
                .orElse(null);
    }

    private Map<String, Object> buildOutput(IteratorTaskExecutionData executionData) {
        Map<String, Object> output = new HashMap<>();
        output.put("totalIterations", executionData.getTotalIterations());
        output.put("successfulIterations", executionData.getSuccessfulIterations());
        output.put("failedIterations", executionData.getFailedIterations());
        output.put("results", executionData.getResults());
        return output;
    }

    private String resolveDoneNextTaskId(IteratorTaskParameters params) {
        String done = params.getDoneNextTaskId();
        if (done == null || done.isBlank()) {
            return null;
        }
        return done;
    }
}
