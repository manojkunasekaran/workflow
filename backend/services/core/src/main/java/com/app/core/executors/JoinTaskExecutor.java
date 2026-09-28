package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.execution.JoinTaskExecutionData;
import com.app.common.model.task.parameters.JoinMergeMode;
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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
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
        String joinTaskId = task.getTaskId();

        @SuppressWarnings("unchecked")
        Map<String, JoinTaskExecutionData.BranchResult> branchResults = (Map<String, JoinTaskExecutionData.BranchResult>) context
                .getTaskOutputs()
                .getOrDefault("__joinArrivals__" + joinTaskId, new HashMap<>());

        Instant joinStart = (Instant) context.getTaskOutputs()
                .getOrDefault("__joinStartTime__" + joinTaskId, Instant.now());
        Instant joinEnd = Instant.now();

        int totalInbounds = branchResults.size();
        int successfulInbounds = 0;
        int failedInbounds = 0;

        for (JoinTaskExecutionData.BranchResult result : branchResults.values()) {
            if (TaskExecutionStatus.COMPLETED.equals(result.getStatus())) {
                successfulInbounds++;
            } else {
                failedInbounds++;
            }
        }

        log.info("Join task {} — total={}, successful={}, failed={}",
                task.getTaskId(), totalInbounds, successfulInbounds, failedInbounds);

        // Apply failure strategy
        boolean shouldFail = switch (params.getFailureStrategy()) {
            case FAIL_FAST, REQUIRE_ALL -> failedInbounds > 0;
            case WAIT_FOR_ALL -> successfulInbounds == 0;
        };

        JoinMergeMode mergeMode = params.getMergeMode() != null
                ? params.getMergeMode()
                : JoinMergeMode.PASS_THROUGH;
        List<String> expectedInboundIds = params.getInboundTaskIds() != null
                ? new ArrayList<>(params.getInboundTaskIds())
                : List.of();
        List<String> arrivedInboundIds = new ArrayList<>();
        for (String inboundId : expectedInboundIds) {
            if (branchResults.containsKey(inboundId)) {
                arrivedInboundIds.add(inboundId);
            }
        }
        for (String inboundId : branchResults.keySet()) {
            if (!arrivedInboundIds.contains(inboundId)) {
                arrivedInboundIds.add(inboundId);
            }
        }

        JoinTaskExecutionData executionData = JoinTaskExecutionData.builder()
                .joinTaskId(joinTaskId)
                .totalInbounds(totalInbounds)
                .successfulInbounds(successfulInbounds)
                .failedInbounds(failedInbounds)
                .inboundResults(branchResults)
                .waitPolicy(params.getWaitPolicy())
                .quorumCount(params.getQuorumCount())
                .failureStrategy(params.getFailureStrategy())
                .mergeMode(mergeMode)
                .expectedInboundIds(expectedInboundIds)
                .arrivedInboundIds(arrivedInboundIds)
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
                .nextTaskId(params.getNextTaskId())
                .build();
    }
}
