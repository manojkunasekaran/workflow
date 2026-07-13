package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.execution.WaitTaskExecutionData;
import com.app.common.model.task.parameters.WaitTaskParameters;

import com.app.core.model.ExecutionContext;
import com.app.core.service.TaskExecutor;
import com.app.core.service.VariableResolver;
import com.app.messaging.dispatch.DelayedExecutionMessageDispatcher;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Executor for WAIT task type.
 * Delays workflow execution for a specified duration.
 * Supports variable substitution for the duration value.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WaitTaskExecutor implements TaskExecutor {

    private final VariableResolver variableResolver;
    private final DelayedExecutionMessageDispatcher delayedExecutionMessageDispatcher;

    @Override
    public boolean canExecute(TaskType taskType) {
        return TaskType.WAIT == taskType;
    }

    @Override
    public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
        log.info("Executing Wait Task: {}", task.getTaskId());

        if (!(task.getParameters() instanceof WaitTaskParameters params)) {
            throw new IllegalArgumentException("Invalid parameters for Wait task");
        }

        // Resolve duration (supports variable substitution)
        Long duration = resolveDuration(params.getDuration(), context);

        if (duration == null || duration < 0) {
            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.FAILED)
                    .errorMessage("Invalid wait duration: " + duration)
                    .build();
        }

        log.info("Wait task {} scheduling delayed continuation in {} ms", task.getTaskId(), duration);

        Instant waitStart = Instant.now();
        Instant waitEnd = waitStart.plusMillis(duration);

        // Build execution data for audit trail
        WaitTaskExecutionData executionData = WaitTaskExecutionData.builder()
                .duration(duration)
                .waitStartTime(waitStart)
                .waitEndTime(waitEnd)
                .build();

        delayedExecutionMessageDispatcher.dispatch(execution.getId(), duration);

        return TaskExecutionResult.builder()
                .status(TaskExecutionResult.Status.PAUSED)
                .nextTaskId(context.getSequentialNextTaskId(task.getTaskId()))
                .executionData(executionData)
                .output(buildOutput(executionData))
                .build();
    }

    /**
     * Resolve the duration value, supporting variable substitution.
     * If the duration appears to be a variable reference stored as a number,
     * resolve it from context. Otherwise return as-is.
     */
    private Long resolveDuration(Long duration, ExecutionContext context) {
        if (duration == null) {
            return null;
        }
        // The duration is already deserialized as a Long from JSON.
        // Variable substitution for expressions like {{$variables.waitTime}}
        // is handled by VariableResolver at the string level before JSON parsing.
        // Here we validate and return the resolved numeric value.
        String durationStr = String.valueOf(duration);
        Object resolved = variableResolver.resolveValue(durationStr, context);
        if (resolved instanceof Number number) {
            return number.longValue();
        }
        return duration;
    }
}
