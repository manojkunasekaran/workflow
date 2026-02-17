package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.execution.ConditionalTaskExecutionData;
import com.app.common.model.task.parameters.ConditionalTaskParameters;
import com.app.common.model.task.parameters.ConditionalTaskParameters.Branch;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.TaskType;

import com.app.common.model.task.WorkflowTask;
import com.app.core.model.ExecutionContext;
import com.app.core.rule.RuleEvaluator;
import com.app.core.service.TaskExecutor;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;

/**
 * Executor for CONDITIONAL task type.
 * Evaluates branch conditions using RuleEvaluator and determines the next task.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ConditionalTaskExecutor implements TaskExecutor {

    private final RuleEvaluator ruleEvaluator;

    @Override
    public boolean canExecute(TaskType taskType) {
        return TaskType.CONDITIONAL == taskType;
    }

    @Override
    public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
        log.info("Executing Conditional Task: {}", task.getTaskId());

        if (!(task.getParameters() instanceof ConditionalTaskParameters params)) {
            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.FAILED)
                    .errorMessage("Invalid parameters for Conditional task")
                    .build();
        }

        // Evaluate branches in order - first match wins
        String nextTaskId = params.getDefaultNextTaskId();
        String matchedBranch = "default";
        int branchesEvaluated = 0;

        if (params.getBranches() != null) {
            for (Branch branch : params.getBranches()) {
                branchesEvaluated++;
                try {
                    if (ruleEvaluator.evaluate(branch, context)) {
                        nextTaskId = branch.getNextTaskId();
                        matchedBranch = branch.getName() != null ? branch.getName() : "unnamed";
                        log.info("Branch '{}' matched for task {}", matchedBranch, task.getTaskId());
                        break;
                    }
                } catch (Exception e) {
                    log.error("Error evaluating branch '{}': {}", branch.getName(), e.getMessage());
                    // Continue to next branch on error
                }
            }
        }

        log.info("Conditional task {} resolved to branch '{}' -> next task: {}",
                task.getTaskId(), matchedBranch, nextTaskId);

        // Build execution data for audit trail (stores input + output + metrics)
        ConditionalTaskExecutionData executionData = ConditionalTaskExecutionData.builder()
                // INPUT: Snapshot of what was available during evaluation
                .taskOutputsSnapshot(new java.util.HashMap<>(context.getTaskOutputs()))
                .variablesSnapshot(new HashMap<>(context.getWorkflowVariables()))
                // OUTPUT: The result
                .matchedBranch(matchedBranch)
                .nextTaskId(nextTaskId)
                // METRICS
                .branchesEvaluated(branchesEvaluated)
                .totalBranches(params.getBranches() != null ? params.getBranches().size() : 0)
                .build();

        return TaskExecutionResult.builder()
                .status(TaskExecutionResult.Status.COMPLETED)
                .nextTaskId(nextTaskId)
                .executionData(executionData)
                .output(buildOutput(executionData))
                .build();
    }

}
