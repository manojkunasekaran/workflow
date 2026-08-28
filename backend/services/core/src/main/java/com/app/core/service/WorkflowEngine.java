package com.app.core.service;

import com.app.common.constant.TaskExecutionStatus;
import com.app.common.constant.WorkflowExecutionStatus;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.entity.WorkflowExecution;
import com.app.common.entity.WorkflowTaskExecution;
import com.app.execution.events.ExecutionEvent;
import com.app.execution.events.ExecutionEventPublisher;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.execution.JoinTaskExecutionData;
import com.app.common.model.task.parameters.BranchTaskParameters;

import com.app.core.model.ExecutionContext;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import com.app.persistence.repository.WorkflowExecutionRepository;
import com.app.persistence.repository.WorkflowTaskExecutionRepository;

import jakarta.annotation.PreDestroy;
import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;

/**
 * Core workflow orchestration engine.
 */
@Slf4j
@Service
public class WorkflowEngine {

    private final List<TaskExecutor> taskExecutors;

    private final WorkflowDefinitionRepository definitionRepository;
    private final WorkflowExecutionRepository executionRepository;
    private final WorkflowTaskExecutionRepository taskExecutionRepository;
    private final ExecutionEventPublisher eventPublisher;

    private final ExecutorService executor;

    public WorkflowEngine(List<TaskExecutor> taskExecutors,
            WorkflowExecutionRepository executionRepository,
            WorkflowTaskExecutionRepository taskExecutionRepository,
            WorkflowDefinitionRepository definitionRepository,
            ExecutionEventPublisher eventPublisher,
            @org.springframework.beans.factory.annotation.Value("${workflow.engine.core-pool-size:10}") int corePoolSize,
            @org.springframework.beans.factory.annotation.Value("${workflow.engine.max-pool-size:50}") int maxPoolSize,
            @org.springframework.beans.factory.annotation.Value("${workflow.engine.queue-capacity:200}") int queueCapacity) {
        this.taskExecutors = taskExecutors;
        this.definitionRepository = definitionRepository;
        this.executionRepository = executionRepository;
        this.taskExecutionRepository = taskExecutionRepository;
        this.eventPublisher = eventPublisher;
        this.executor = new java.util.concurrent.ThreadPoolExecutor(
                corePoolSize, maxPoolSize, 60L, java.util.concurrent.TimeUnit.SECONDS,
                new java.util.concurrent.LinkedBlockingQueue<>(queueCapacity),
                new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
    }

    @PreDestroy
    public void shutdown() {
        executor.shutdown();
    }

    /**
     * Process an execution message — claims non-terminal status → RUNNING and runs the workflow.
     */
    public void processExecution(String executionId) {
        log.info("Processing execution: executionId={}", executionId);

        WorkflowExecution execution = executionRepository.findById(executionId)
                .orElseThrow(() -> new IllegalStateException("Execution not found: " + executionId));

        if (shouldSkipProcessing(execution)) {
            log.warn("Skipping execution {} — status {}", executionId, execution.getStatus());
            return;
        }

        execution.setStatus(WorkflowExecutionStatus.RUNNING);
        execution.setEndTime(null);
        executionRepository.save(execution);

        String definitionId = execution.getWorkflowDefinitionId();
        WorkflowDefinition definition = definitionRepository.findById(definitionId)
                .orElseThrow(() -> new com.app.common.exception.ResourceNotFoundException(
                        "WorkflowDefinition", definitionId));

        publishEvent(execution);

        CompletableFuture.runAsync(() -> executeWorkflow(definition, executionId), executor);
    }

    private boolean shouldSkipProcessing(WorkflowExecution execution) {
        WorkflowExecutionStatus status = execution.getStatus();
        return WorkflowExecutionStatus.COMPLETED.equals(status)
                || WorkflowExecutionStatus.FAILED.equals(status)
                || WorkflowExecutionStatus.RUNNING.equals(status);
    }

    private void publishEvent(WorkflowExecution execution) {
        if (execution.getStatus() == null) {
            return;
        }
        eventPublisher.publish(ExecutionEvent.of(
                execution.getId(),
                execution.getStatus().name(),
                execution.getCurrentTaskId()));
    }

    /**
     * Core execution loop — runs tasks sequentially, handles branching and pausing.
     * When a task returns PAUSED, persists state and exits naturally.
     */
    private void executeWorkflow(WorkflowDefinition definition, @NonNull final String executionId) {
        WorkflowExecution execution = executionRepository.findById(executionId)
                .orElseThrow(() -> new IllegalStateException("Execution not found: " + executionId));

        if (WorkflowExecutionStatus.COMPLETED.equals(execution.getStatus())
                || WorkflowExecutionStatus.FAILED.equals(execution.getStatus())) {
            log.warn("Skipping workflow loop for execution {} — status {}", executionId, execution.getStatus());
            return;
        }

        List<WorkflowTask> tasks = definition.getTasks();
        if (tasks == null || tasks.isEmpty()) {
            log.warn("Workflow {} has no tasks", definition.getId());
            execution.setStatus(WorkflowExecutionStatus.COMPLETED);
            return;
        }

        ExecutionContext context = ExecutionContext.fromExecution(
                execution.getTriggerInputs(),
                execution.getTaskOutputs(),
                execution.getId(),
                definition);

        try {
            String currentTaskId = execution.getCurrentTaskId() != null
                    ? execution.getCurrentTaskId()
                    : getFirstNonToolTaskId(tasks);

            execution.setCurrentTaskId(null);

            while (currentTaskId != null) {
                WorkflowTask currentTask = findTaskById(tasks, currentTaskId);
                if (currentTask == null) {
                    throw new IllegalArgumentException("Task not found: " + currentTaskId);
                }

                // Execute the task
                Instant taskStartTime = Instant.now();
                TaskExecutionResult result = executeTask(currentTask, execution, context);
                Instant taskEndTime = Instant.now();

                // Store task output for variable resolution
                if (result.getOutput() != null) {
                    execution.getTaskOutputs().put(currentTask.getTaskId(), result.getOutput());
                }

                // Record task execution
                recordTaskExecution(execution, currentTask, result, taskStartTime);

                // Stop early if this execution is testing a specific target task
                if (currentTask.getTaskId().equals(execution.getTargetTaskId())) {
                    log.info("Test target task '{}' completed, stopping test execution.", currentTask.getTaskId());
                    execution.setStatus(WorkflowExecutionStatus.COMPLETED);
                    break;
                }

                // PAUSED: set resume cursor and exit loop — finally persists once
                if (result.getStatus() == TaskExecutionResult.Status.PAUSED) {
                    execution.setCurrentTaskId(result.getNextTaskId() != null
                            ? result.getNextTaskId()
                            : currentTask.getTaskId());
                    execution.setStatus(WorkflowExecutionStatus.PAUSED);
                    log.info("Workflow {} paused at task '{}'", execution.getId(), currentTask.getTaskId());
                    break;
                }

                // FAILED
                if (result.getStatus() == TaskExecutionResult.Status.FAILED) {
                    execution.setStatus(WorkflowExecutionStatus.FAILED);
                    break;
                }

                // BRANCHED: execute branches in parallel
                if (result.getStatus() == TaskExecutionResult.Status.BRANCHED) {
                    BranchTaskParameters branchParams = (BranchTaskParameters) currentTask.getParameters();
                    boolean branchSuccess = executeParallelBranches(
                            currentTask.getTaskId(), branchParams, tasks, execution, context, result);

                    if (!branchSuccess) {
                        execution.setStatus(WorkflowExecutionStatus.FAILED);
                        break;
                    }

                    // After branches complete, jump to JOIN task (or end)
                    currentTaskId = branchParams.getJoinTaskId();
                    continue;
                }

                // Next task
                currentTaskId = result.getNextTaskId() != null
                        ? result.getNextTaskId()
                        : getNextTaskId(tasks, currentTask.getTaskId());
            }

            if (WorkflowExecutionStatus.RUNNING.equals(execution.getStatus())) {
                execution.setStatus(WorkflowExecutionStatus.COMPLETED);
            }

        } catch (Exception e) {
            log.error("Workflow execution failed: {}", e.getMessage(), e);
            execution.setStatus(WorkflowExecutionStatus.FAILED);
        } finally {
            execution.setEndTime(Instant.now());
            executionRepository.save(execution);
            publishEvent(execution);
        }

    }

    /**
     * Execute a single sub-task and record its execution (used by AI Agents and Iterators).
     */
    public TaskExecutionResult executeSubTask(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
        Instant startTime = Instant.now();
        TaskExecutionResult result = executeTask(task, execution, context);
        recordTaskExecution(execution, task, result, startTime);
        return result;
    }

    /**
     * Execute a single task using the appropriate executor.
     */
    private TaskExecutionResult executeTask(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
        TaskType taskType = task.getType();

        for (TaskExecutor executor : taskExecutors) {
            if (executor.canExecute(taskType)) {
                log.info("Executing task {} with {}", task.getTaskId(), executor.getClass().getSimpleName());
                return executor.execute(task, execution, context);
            }
        }

        throw new IllegalStateException("No executor found for task type: " + taskType);
    }

    /**
     * Record task execution in database.
     */
    private void recordTaskExecution(WorkflowExecution execution, WorkflowTask task, TaskExecutionResult result, Instant startTime) {
        if (hasTerminalTaskExecution(execution.getId(), task.getTaskId())) {
            return;
        }

        WorkflowTaskExecution taskExecution = new WorkflowTaskExecution();
        taskExecution.setWorkflowExecutionId(execution.getId());
        taskExecution.setWorkflowDefinitionId(execution.getWorkflowId());
        taskExecution.setTaskDefinitionId(task.getTaskId());
        taskExecution.setTaskType(task.getType().name());
        taskExecution.setStatus(TaskExecutionStatus.valueOf(result.getStatus().name()));
        taskExecution.setStartTime(startTime);
        taskExecution.setEndTime(Instant.now());
        taskExecution.setExecutionData(result.getExecutionData());

        if (result.getErrorMessage() != null) {
            taskExecution.setErrorMessage(result.getErrorMessage());
        }

        taskExecution = taskExecutionRepository.save(taskExecution);

        // Add summary to execution
        WorkflowExecution.TaskExecutionSummary summary = new WorkflowExecution.TaskExecutionSummary();
        summary.setTaskExecutionId(taskExecution.getId());
        summary.setTaskDefinitionId(task.getTaskId());
        summary.setStatus(TaskExecutionStatus.valueOf(result.getStatus().name()));
        execution.getTaskExecutionSummaries().add(summary);
    }

    private boolean hasTerminalTaskExecution(String executionId, String taskDefinitionId) {
        return taskExecutionRepository.findAllByWorkflowExecutionId(executionId).stream()
                .filter(t -> taskDefinitionId.equals(t.getTaskDefinitionId()))
                .anyMatch(t -> TaskExecutionStatus.COMPLETED.equals(t.getStatus())
                        || TaskExecutionStatus.FAILED.equals(t.getStatus()));
    }

    /**
     * Find a task by ID.
     */
    private WorkflowTask findTaskById(List<WorkflowTask> tasks, String taskId) {
        return tasks.stream()
                .filter(t -> t.getTaskId().equals(taskId))
                .findFirst()
                .orElse(null);
    }

    /**
     * Get the next task ID in sequence.
     */
    private String getNextTaskId(List<WorkflowTask> tasks, String currentTaskId) {
        for (int i = 0; i < tasks.size() - 1; i++) {
            if (tasks.get(i).getTaskId().equals(currentTaskId)) {
                for (int j = i + 1; j < tasks.size(); j++) {
                    if (!Boolean.TRUE.equals(tasks.get(j).getIsTool())) {
                        return tasks.get(j).getTaskId();
                    }
                }
                return null;
            }
        }
        return null; // No more tasks
    }

    private String getFirstNonToolTaskId(List<WorkflowTask> tasks) {
        for (WorkflowTask task : tasks) {
            if (!Boolean.TRUE.equals(task.getIsTool())) {
                return task.getTaskId();
            }
        }
        return null;
    }

    // ── Parallel branch execution ──

    /**
     * Execute parallel branches concurrently using CompletableFuture.
     * Each branch runs in an isolated ExecutionContext.
     *
     * @return true if all branches succeeded, false if any failed
     */
    private boolean executeParallelBranches(
            String branchTaskId,
            BranchTaskParameters branchParams,
            List<WorkflowTask> tasks,
            WorkflowExecution execution,
            ExecutionContext parentContext,
            TaskExecutionResult branchResult) {

        List<BranchTaskParameters.ParallelBranch> branches = branchParams.getBranches();
        List<String> branchIds = branchResult.getParallelBranchIds();
        String joinTaskId = branchParams.getJoinTaskId();

        Map<String, JoinTaskExecutionData.BranchResult> branchResults = new ConcurrentHashMap<>();
        Instant branchStartTime = Instant.now();

        // Spawn each branch as a CompletableFuture
        List<CompletableFuture<Void>> futures = new ArrayList<>();

        for (int i = 0; i < branches.size(); i++) {
            BranchTaskParameters.ParallelBranch branch = branches.get(i);
            String branchId = branchIds.get(i);

            CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
                ExecutionContext branchContext = ExecutionContext.createBranch(
                        parentContext, branchId, branch.getBranchName());

                JoinTaskExecutionData.BranchResult result = executeBranch(
                        branchParams, branch, branchId, tasks, execution, branchContext, joinTaskId);

                branchResults.put(branch.getBranchName(), result);
            }, executor);

            futures.add(future);
        }

        // Wait for all branches to complete
        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        } catch (Exception e) {
            log.error("Error waiting for parallel branches: {}", e.getMessage(), e);
        }

        // Store branch results in context for the JOIN executor (keyed by BRANCH task id)
        parentContext.getTaskOutputs().put(
                "__branchResults__" + branchTaskId, branchResults);
        parentContext.getTaskOutputs().put(
                "__branchStartTime__" + branchTaskId, branchStartTime);

        // Merge branch task outputs into parent context
        for (JoinTaskExecutionData.BranchResult br : branchResults.values()) {
            if (br.getOutput() != null) {
                parentContext.getTaskOutputs().putAll(br.getOutput());
            }
        }

        // Always return true — the JoinTaskExecutor will apply the failure
        // strategy (FAIL_FAST, WAIT_FOR_ALL, REQUIRE_ALL) and decide whether
        // the workflow should fail.
        return true;
    }

    /**
     * Execute a single branch sequentially until it reaches the join task or ends.
     */
    private JoinTaskExecutionData.BranchResult executeBranch(
            BranchTaskParameters branchParams,
            BranchTaskParameters.ParallelBranch branch,
            String branchId,
            List<WorkflowTask> tasks,
            WorkflowExecution execution,
            ExecutionContext branchContext,
            String joinTaskId) {

        log.info("Starting branch '{}' (ID: {}) at task: {}",
                branch.getBranchName(), branchId, branch.getStartTaskId());

        String currentTaskId = branch.getStartTaskId();
        int tasksExecuted = 0;
        String lastTaskId = null;
        Map<String, Object> branchOutputs = new HashMap<>();

        try {
            while (currentTaskId != null) {
                // Stop before the JOIN task
                if (joinTaskId != null && currentTaskId.equals(joinTaskId)) {
                    break;
                }

                WorkflowTask currentTask = findTaskById(tasks, currentTaskId);
                if (currentTask == null) {
                    throw new IllegalArgumentException(
                            "Task not found in branch '" + branch.getBranchName() + "': " + currentTaskId);
                }

                Instant taskStartTime = Instant.now();
                TaskExecutionResult result = executeTask(currentTask, execution, branchContext);
                tasksExecuted++;
                lastTaskId = currentTaskId;

                // Store output in branch context
                if (result.getOutput() != null) {
                    branchContext.getTaskOutputs().put(currentTask.getTaskId(), result.getOutput());
                    branchOutputs.put(currentTask.getTaskId(), result.getOutput());
                }

                // Record task execution (thread-safe via repository)
                recordTaskExecution(execution, currentTask, result, taskStartTime);

                if (result.getStatus() == TaskExecutionResult.Status.FAILED) {
                    return JoinTaskExecutionData.BranchResult.builder()
                            .branchName(branch.getBranchName())
                            .status(TaskExecutionStatus.FAILED)
                            .tasksExecuted(tasksExecuted)
                            .lastTaskId(lastTaskId)
                            .errorMessage(result.getErrorMessage())
                            .output(branchOutputs)
                            .build();
                }

                if (branch.getEndTaskId() != null && !branch.getEndTaskId().isBlank()
                        && currentTaskId.equals(branch.getEndTaskId().trim())) {
                    break;
                }

                String nextTaskId = result.getNextTaskId() != null
                        ? result.getNextTaskId()
                        : getNextTaskId(tasks, currentTask.getTaskId());

                if (nextTaskId != null && isSiblingBranchStart(branchParams, branch, nextTaskId)) {
                    break;
                }

                currentTaskId = nextTaskId;
            }

            return JoinTaskExecutionData.BranchResult.builder()
                    .branchName(branch.getBranchName())
                    .status(TaskExecutionStatus.COMPLETED)
                    .tasksExecuted(tasksExecuted)
                    .lastTaskId(lastTaskId)
                    .output(branchOutputs)
                    .build();

        } catch (Exception e) {
            log.error("Branch '{}' failed: {}", branch.getBranchName(), e.getMessage(), e);
            return JoinTaskExecutionData.BranchResult.builder()
                    .branchName(branch.getBranchName())
                    .status(TaskExecutionStatus.FAILED)
                    .tasksExecuted(tasksExecuted)
                    .lastTaskId(lastTaskId)
                    .errorMessage(e.getMessage())
                    .output(branchOutputs)
                    .build();
        }
    }

    private boolean isSiblingBranchStart(
            BranchTaskParameters branchParams,
            BranchTaskParameters.ParallelBranch currentBranch,
            String taskId) {
        if (branchParams.getBranches() == null || taskId == null) {
            return false;
        }
        String currentStart = currentBranch.getStartTaskId();
        for (BranchTaskParameters.ParallelBranch sibling : branchParams.getBranches()) {
            if (Objects.equals(sibling.getStartTaskId(), currentStart)) {
                continue;
            }
            if (taskId.equals(sibling.getStartTaskId())) {
                return true;
            }
        }
        return false;
    }
}
