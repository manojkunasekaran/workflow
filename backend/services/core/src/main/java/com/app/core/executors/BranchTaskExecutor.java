package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.execution.BranchTaskExecutionData;
import com.app.common.model.task.parameters.BranchTaskParameters;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;

import com.app.core.model.ExecutionContext;
import com.app.core.service.TaskExecutor;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Executor for BRANCH task type.
 * Creates isolated execution contexts for each parallel branch and
 * delegates the actual parallel execution to the WorkflowEngine.
 *
 * The BRANCH task itself returns immediately with a BRANCHED status.
 * The WorkflowEngine uses the returned branch metadata to spawn
 * concurrent executions.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BranchTaskExecutor implements TaskExecutor {

    @Override
    public boolean canExecute(TaskType taskType) {
        return TaskType.BRANCH == taskType;
    }

    @Override
    public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
        log.info("Executing Branch Task: {}", task.getTaskId());

        if (!(task.getParameters() instanceof BranchTaskParameters params)) {
            throw new IllegalArgumentException("Invalid parameters for Branch task");
        }

        if (params.getBranches() == null || params.getBranches().isEmpty()) {
            throw new IllegalArgumentException("Branch task must have at least one branch defined");
        }

        List<String> branchIds = new ArrayList<>();
        for (int i = 0; i < params.getBranches().size(); i++) {
            branchIds.add(UUID.randomUUID().toString());
        }

        log.info("Branch task {} creating {} parallel branches: {}",
                task.getTaskId(), params.getBranches().size(),
                params.getBranches().stream()
                        .map(BranchTaskParameters.ParallelBranch::getBranchName)
                        .collect(Collectors.toList()));

        // Build execution data for audit trail
        BranchTaskExecutionData executionData = BranchTaskExecutionData.builder()
                .branchesCreated(params.getBranches().size())
                .branchIds(branchIds)
                .joinTaskId(params.getJoinTaskId())
                .branchStartTime(Instant.now())
                .build();

        return TaskExecutionResult.builder()
                .status(TaskExecutionResult.Status.BRANCHED)
                .executionData(executionData)
                .output(buildOutput(executionData))
                .parallelBranchIds(branchIds)
                // nextTaskId is set to joinTaskId (or null) — the engine handles branching
                .nextTaskId(params.getJoinTaskId())
                .build();
    }
}
