package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.execution.JoinTaskExecutionData;
import com.app.common.model.task.parameters.JoinTaskParameters;
import com.app.common.constant.TaskExecutionStatus;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;

import com.app.core.model.ExecutionContext;
import com.app.core.service.TaskExecutor;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Executor for JOIN task type.
 * Gathers parallel branches spawned by a BRANCH task and synchronizes
 * them before the workflow continues.
 *
 * NOTE: The actual waiting for parallel futures is handled by the
 * WorkflowEngine. This executor is invoked AFTER all branches have
 * completed (or failed), and it processes the collected branch results
 * to build the final output and determine the next task.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JoinTaskExecutor implements TaskExecutor {

    @Override
    public boolean canExecute(TaskType taskType) {
        return TaskType.JOIN == taskType;
    }

    @Override
    public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
        log.info("Executing Join Task: {}", task.getTaskId());

        if (!(task.getParameters() instanceof JoinTaskParameters params)) {
            throw new IllegalArgumentException("Invalid parameters for Join task");
        }

        // Branch results are injected into the context by the WorkflowEngine
        // before this executor is called. They are stored under a special key.
        @SuppressWarnings("unchecked")
        Map<String, JoinTaskExecutionData.BranchResult> branchResults = (Map<String, JoinTaskExecutionData.BranchResult>) context
                .getTaskOutputs()
                .getOrDefault("__branchResults__" + params.getBranchTaskId(), new HashMap<>());

        Instant joinStart = (Instant) context.getTaskOutputs()
                .getOrDefault("__branchStartTime__" + params.getBranchTaskId(), Instant.now());
        Instant joinEnd = Instant.now();

        int totalBranches = branchResults.size();
        int successfulBranches = 0;
        int failedBranches = 0;

        for (JoinTaskExecutionData.BranchResult result : branchResults.values()) {
            if (TaskExecutionStatus.COMPLETED.equals(result.getStatus())) {
                successfulBranches++;
            } else {
                failedBranches++;
            }
        }

        log.info("Join task {} — total={}, successful={}, failed={}",
                task.getTaskId(), totalBranches, successfulBranches, failedBranches);

        // Apply failure strategy
        boolean shouldFail = switch (params.getFailureStrategy()) {
            case FAIL_FAST, REQUIRE_ALL -> failedBranches > 0;
            case WAIT_FOR_ALL -> successfulBranches == 0;
        };

        JoinTaskExecutionData executionData = JoinTaskExecutionData.builder()
                .branchTaskId(params.getBranchTaskId())
                .totalBranches(totalBranches)
                .successfulBranches(successfulBranches)
                .failedBranches(failedBranches)
                .branchResults(branchResults)
                .joinStartTime(joinStart)
                .joinEndTime(joinEnd)
                .joinDurationMs(Duration.between(joinStart, joinEnd).toMillis())
                .build();

        if (shouldFail) {
            // Collect first error message
            String firstError = branchResults.values().stream()
                    .filter(r -> r.getErrorMessage() != null)
                    .map(JoinTaskExecutionData.BranchResult::getErrorMessage)
                    .findFirst()
                    .orElse("One or more branches failed");

            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.FAILED)
                    .errorMessage(firstError)
                    .executionData(executionData)
                    .output(buildOutput(executionData))
                    .build();
        }

        return TaskExecutionResult.builder()
                .status(TaskExecutionResult.Status.COMPLETED)
                .executionData(executionData)
                .output(buildOutput(executionData))
                .build();
    }
}
