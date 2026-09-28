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
import com.app.common.graph.WorkflowGraph;
import com.app.common.graph.WorkflowTopologyResolver;
import com.app.common.model.task.parameters.BranchTaskParameters;
import com.app.common.model.task.parameters.JoinTaskParameters;

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
    private final long defaultJoinBarrierTimeoutMs;

    public WorkflowEngine(List<TaskExecutor> taskExecutors,
            WorkflowExecutionRepository executionRepository,
            WorkflowTaskExecutionRepository taskExecutionRepository,
            WorkflowDefinitionRepository definitionRepository,
            ExecutionEventPublisher eventPublisher,
            @org.springframework.beans.factory.annotation.Value("${workflow.engine.core-pool-size:10}") int corePoolSize,
            @org.springframework.beans.factory.annotation.Value("${workflow.engine.max-pool-size:50}") int maxPoolSize,
            @org.springframework.beans.factory.annotation.Value("${workflow.engine.queue-capacity:200}") int queueCapacity,
            @org.springframework.beans.factory.annotation.Value("${workflow.engine.join-barrier-timeout-ms:300000}") long defaultJoinBarrierTimeoutMs) {
        this.taskExecutors = taskExecutors;
        this.definitionRepository = definitionRepository;
        this.executionRepository = executionRepository;
        this.taskExecutionRepository = taskExecutionRepository;
        this.eventPublisher = eventPublisher;
        this.defaultJoinBarrierTimeoutMs = defaultJoinBarrierTimeoutMs;
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

        WorkflowGraph graph = WorkflowTopologyResolver.graphFromDefinition(definition);
        JoinBarrier joinBarrier = new JoinBarrier();

        try {
            String currentTaskId = execution.getCurrentTaskId() != null && !execution.getCurrentTaskId().isBlank()
                    ? execution.getCurrentTaskId()
                    : getFirstNonToolTaskId(tasks);

            execution.setCurrentTaskId(null);

            int executionCount = 0;
            final int MAX_TASKS = 10000;

            while (currentTaskId != null) {
                if (executionCount++ > MAX_TASKS) {
                    throw new IllegalStateException("Maximum task execution limit reached (possible infinite loop)");
                }

                WorkflowTask currentTask = findTaskById(tasks, currentTaskId);
                if (currentTask == null) {
                    throw new IllegalArgumentException("Task not found: " + currentTaskId);
                }

                if (currentTask.getType() == TaskType.JOIN) {
                    String joinNext = executeJoinWhenBarrierReady(
                            currentTask,
                            tasks,
                            execution,
                            context,
                            graph,
                            joinBarrier);
                    if (joinNext == null) {
                        execution.setStatus(WorkflowExecutionStatus.FAILED);
                        break;
                    }
                    currentTaskId = joinNext;
                    continue;
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
                    execution.setCurrentTaskId(result.getNextTaskId() != null && !result.getNextTaskId().isBlank()
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

                recordSequentialInboundArrival(
                        currentTask.getTaskId(),
                        result,
                        graph,
                        joinBarrier);

                // BRANCHED: spawn parallel paths, await barrier, then run JOIN
                if (result.getStatus() == TaskExecutionResult.Status.BRANCHED) {
                    BranchTaskParameters branchParams = (BranchTaskParameters) currentTask.getParameters();
                    String joinTaskId = resolveContinuationJoinId(currentTask, tasks, graph);

                    Instant branchStartTime = Instant.now();
                    List<CompletableFuture<JoinTaskExecutionData.BranchResult>> branchFutures = spawnParallelBranches(
                            currentTask.getTaskId(),
                            branchParams,
                            tasks,
                            execution,
                            context,
                            result,
                            definition,
                            graph,
                            joinTaskId,
                            joinBarrier,
                            branchStartTime);

                    if (joinTaskId == null || joinTaskId.isBlank()) {
                        log.error("BRANCH task {} has no continuation JOIN", currentTask.getTaskId());
                        execution.setStatus(WorkflowExecutionStatus.FAILED);
                        break;
                    }

                    WorkflowTask joinTask = findTaskById(tasks, joinTaskId);
                    if (joinTask == null || joinTask.getType() != TaskType.JOIN
                            || !(joinTask.getParameters() instanceof JoinTaskParameters)) {
                        log.error("Continuation task {} is not a valid JOIN", joinTaskId);
                        execution.setStatus(WorkflowExecutionStatus.FAILED);
                        break;
                    }

                    String joinNext = executeJoinWhenBarrierReady(
                            joinTask,
                            tasks,
                            execution,
                            context,
                            graph,
                            joinBarrier,
                            branchStartTime);
                    drainBranchFutures(branchFutures);

                    if (joinNext == null) {
                        execution.setStatus(WorkflowExecutionStatus.FAILED);
                        break;
                    }

                    currentTaskId = joinNext;
                    continue;
                }

                // Next task
                currentTaskId = result.getNextTaskId() != null && !result.getNextTaskId().isBlank()
                        ? result.getNextTaskId()
                        : getNextTaskId(tasks, currentTask);
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
    private String getNextTaskId(List<WorkflowTask> tasks, WorkflowTask currentTask) {
        if (currentTask != null && currentTask.getNextTaskId() != null && !currentTask.getNextTaskId().isBlank()) {
            return currentTask.getNextTaskId();
        }

        String currentTaskId = currentTask.getTaskId();
        for (int i = 0; i < tasks.size(); i++) {
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

    private String resolveNextTaskId(
            WorkflowTask currentTask,
            List<WorkflowTask> tasks,
            WorkflowGraph graph,
            TaskExecutionResult result) {
        if (result.getNextTaskId() != null && !result.getNextTaskId().isBlank()) {
            return result.getNextTaskId();
        }

        String chainNext = graph.getChainOut(currentTask.getTaskId());
        if (chainNext != null && !chainNext.isBlank()) {
            return chainNext;
        }

        return getNextTaskId(tasks, currentTask);
    }

    private String resolveContinuationJoinId(
            WorkflowTask branchTask,
            List<WorkflowTask> tasks,
            WorkflowGraph graph) {
        if (branchTask.getNextTaskId() != null && !branchTask.getNextTaskId().isBlank()) {
            WorkflowTask nextTask = findTaskById(tasks, branchTask.getNextTaskId());
            if (nextTask != null && nextTask.getType() == TaskType.JOIN) {
                return nextTask.getTaskId();
            }
        }

        String spineNext = getNextTaskId(tasks, branchTask);
        if (spineNext != null) {
            WorkflowTask nextTask = findTaskById(tasks, spineNext);
            if (nextTask != null && nextTask.getType() == TaskType.JOIN) {
                return spineNext;
            }
        }

        for (WorkflowTask task : tasks) {
            if (task.getType() != TaskType.JOIN) {
                continue;
            }
            List<String> inbounds = WorkflowTopologyResolver.resolveJoinInbounds(task.getTaskId(), graph);
            if (inbounds.isEmpty()) {
                continue;
            }
            List<WorkflowTopologyResolver.BranchPath> paths =
                    WorkflowTopologyResolver.resolveBranchPaths(branchTask.getTaskId(), graph);
            Set<String> tips = new HashSet<>();
            for (WorkflowTopologyResolver.BranchPath path : paths) {
                if (path.tipTaskId() != null && !path.tipTaskId().isBlank()) {
                    tips.add(path.tipTaskId());
                }
            }
            if (!tips.isEmpty() && inbounds.containsAll(tips)) {
                return task.getTaskId();
            }
        }

        return spineNext;
    }

    private void injectJoinArrivals(
            ExecutionContext context,
            String joinTaskId,
            JoinBarrier joinBarrier,
            Instant joinStartTime) {
        context.getTaskOutputs().put(
                "__joinArrivals__" + joinTaskId,
                new HashMap<>(joinBarrier.getArrivals(joinTaskId)));
        context.getTaskOutputs().put("__joinStartTime__" + joinTaskId, joinStartTime);

        for (JoinTaskExecutionData.BranchResult arrival : joinBarrier.getArrivals(joinTaskId).values()) {
            if (arrival.getOutput() != null) {
                context.getTaskOutputs().putAll(arrival.getOutput());
            }
        }
    }

    private long resolveBarrierTimeoutMs(JoinTaskParameters joinParams) {
        if (joinParams.getBarrierTimeoutMs() != null && joinParams.getBarrierTimeoutMs() > 0) {
            return joinParams.getBarrierTimeoutMs();
        }
        return defaultJoinBarrierTimeoutMs;
    }

    private boolean awaitJoinBarrier(
            String joinTaskId,
            JoinTaskParameters joinParams,
            List<String> expectedInbounds,
            JoinBarrier joinBarrier) throws InterruptedException {
        long timeoutMs = resolveBarrierTimeoutMs(joinParams);
        long deadline = System.currentTimeMillis() + timeoutMs;
        long pollIntervalMs = 50L;

        while (!joinBarrier.isSatisfied(
                joinTaskId,
                joinParams.getWaitPolicy(),
                joinParams.getQuorumCount(),
                expectedInbounds)) {
            if (System.currentTimeMillis() >= deadline) {
                log.error(
                        "Join barrier timeout for {} after {} ms — arrivals {}/{}",
                        joinTaskId,
                        timeoutMs,
                        joinBarrier.countArrivals(joinTaskId, expectedInbounds),
                        expectedInbounds.size());
                return false;
            }
            Thread.sleep(pollIntervalMs);
        }
        return true;
    }

    /**
     * Records an arrival when a sequential (non-branch) task that is wired as a JOIN inbound completes.
     */
    private void recordSequentialInboundArrival(
            String completedTaskId,
            TaskExecutionResult result,
            WorkflowGraph graph,
            JoinBarrier joinBarrier) {
        if (completedTaskId == null || completedTaskId.isBlank() || graph == null) {
            return;
        }

        for (Map.Entry<String, List<String>> entry : graph.getJoinInboundsMap().entrySet()) {
            String joinTaskId = entry.getKey();
            if (!WorkflowTopologyResolver.isInboundForJoin(completedTaskId, joinTaskId, graph)) {
                continue;
            }

            TaskExecutionStatus arrivalStatus = result.getStatus() == TaskExecutionResult.Status.FAILED
                    ? TaskExecutionStatus.FAILED
                    : TaskExecutionStatus.COMPLETED;

            Map<String, Object> output = result.getOutput() != null
                    ? new HashMap<>(result.getOutput())
                    : new HashMap<>();

            JoinTaskExecutionData.BranchResult arrival = JoinTaskExecutionData.BranchResult.builder()
                    .branchName(completedTaskId)
                    .status(arrivalStatus)
                    .lastTaskId(completedTaskId)
                    .errorMessage(result.getErrorMessage())
                    .output(output)
                    .build();
            joinBarrier.recordArrival(joinTaskId, completedTaskId, arrival);
        }
    }

    /**
     * Waits for the join barrier, injects arrivals, executes JOIN, and returns the next task ID.
     *
     * @return next task ID after JOIN, or null on failure/timeout
     */
    private String executeJoinWhenBarrierReady(
            WorkflowTask joinTask,
            List<WorkflowTask> tasks,
            WorkflowExecution execution,
            ExecutionContext context,
            WorkflowGraph graph,
            JoinBarrier joinBarrier) {
        return executeJoinWhenBarrierReady(
                joinTask, tasks, execution, context, graph, joinBarrier, Instant.now());
    }

    private String executeJoinWhenBarrierReady(
            WorkflowTask joinTask,
            List<WorkflowTask> tasks,
            WorkflowExecution execution,
            ExecutionContext context,
            WorkflowGraph graph,
            JoinBarrier joinBarrier,
            Instant joinWaitStart) {
        if (!(joinTask.getParameters() instanceof JoinTaskParameters joinParams)) {
            log.error("Task {} is not a valid JOIN", joinTask.getTaskId());
            return null;
        }

        String joinTaskId = joinTask.getTaskId();
        List<String> expectedInbounds = WorkflowTopologyResolver.resolveJoinInbounds(joinTaskId, graph);

        try {
            if (!awaitJoinBarrier(joinTaskId, joinParams, expectedInbounds, joinBarrier)) {
                return null;
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while waiting for join barrier {}", joinTaskId);
            return null;
        }

        injectJoinArrivals(context, joinTaskId, joinBarrier, joinWaitStart);

        Instant joinStartTime = Instant.now();
        TaskExecutionResult joinResult = executeTask(joinTask, execution, context);
        recordTaskExecution(execution, joinTask, joinResult, joinStartTime);

        if (joinResult.getOutput() != null) {
            execution.getTaskOutputs().put(joinTask.getTaskId(), joinResult.getOutput());
        }

        if (joinResult.getStatus() == TaskExecutionResult.Status.FAILED) {
            return null;
        }

        return joinResult.getNextTaskId() != null && !joinResult.getNextTaskId().isBlank()
                ? joinResult.getNextTaskId()
                : getNextTaskId(tasks, joinTask);
    }

    private void drainBranchFutures(List<CompletableFuture<JoinTaskExecutionData.BranchResult>> futures) {
        if (futures == null || futures.isEmpty()) {
            return;
        }
        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        } catch (Exception e) {
            log.warn("One or more branch futures completed with errors: {}", e.getMessage());
        }
    }

    // ── Parallel branch execution ──

    /**
     * Spawn parallel branch paths. Shared by the main thread and nested BRANCHED segments.
     * Caller awaits the join barrier separately so ANY/QUORUM can proceed early.
     */
    private List<CompletableFuture<JoinTaskExecutionData.BranchResult>> spawnParallelBranches(
            String branchTaskId,
            BranchTaskParameters branchParams,
            List<WorkflowTask> tasks,
            WorkflowExecution execution,
            ExecutionContext parentContext,
            TaskExecutionResult branchResult,
            WorkflowDefinition definition,
            WorkflowGraph graph,
            String joinTaskId,
            JoinBarrier joinBarrier,
            Instant branchStartTime) {

        List<BranchTaskParameters.ParallelBranch> branches = branchParams.getBranches();
        List<String> branchIds = branchResult.getParallelBranchIds();

        List<CompletableFuture<JoinTaskExecutionData.BranchResult>> futures = new ArrayList<>();

        for (int i = 0; i < branches.size(); i++) {
            BranchTaskParameters.ParallelBranch branch = branches.get(i);
            String branchId = branchIds.get(i);

            CompletableFuture<JoinTaskExecutionData.BranchResult> future = CompletableFuture.supplyAsync(() -> {
                ExecutionContext branchContext = ExecutionContext.createBranch(
                        parentContext, branchId, branch.getBranchName());

                return executePathSegment(
                        branch.getStartTaskId(),
                        branchParams,
                        branch,
                        branchId,
                        tasks,
                        execution,
                        branchContext,
                        graph,
                        joinTaskId,
                        joinBarrier,
                        branchStartTime,
                        definition);
            }, executor);

            futures.add(future);
        }

        return futures;
    }

    /**
     * Execute a branch path until it reaches a join inbound, a sibling branch start, or a terminal task.
     * Handles nested BRANCHED tasks by recursively spawning inner parallel paths.
     */
    private JoinTaskExecutionData.BranchResult executePathSegment(
            String startTaskId,
            BranchTaskParameters branchParams,
            BranchTaskParameters.ParallelBranch branch,
            String branchId,
            List<WorkflowTask> tasks,
            WorkflowExecution execution,
            ExecutionContext branchContext,
            WorkflowGraph graph,
            String joinTaskId,
            JoinBarrier joinBarrier,
            Instant branchStartTime,
            WorkflowDefinition definition) {

        log.info("Starting branch '{}' (ID: {}) at task: {}",
                branch.getBranchName(), branchId, startTaskId);

        String currentTaskId = startTaskId;
        int tasksExecuted = 0;
        String lastTaskId = null;
        Map<String, Object> branchOutputs = new HashMap<>();

        try {
            while (currentTaskId != null && !currentTaskId.isBlank()) {
                if (tasksExecuted >= 10000) {
                    throw new IllegalStateException("Maximum task execution limit reached in branch (possible infinite loop)");
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

                if (result.getOutput() != null) {
                    branchContext.getTaskOutputs().put(currentTask.getTaskId(), result.getOutput());
                    branchOutputs.put(currentTask.getTaskId(), result.getOutput());
                }

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

                if (result.getStatus() == TaskExecutionResult.Status.BRANCHED) {
                    BranchTaskParameters innerParams = (BranchTaskParameters) currentTask.getParameters();
                    List<CompletableFuture<JoinTaskExecutionData.BranchResult>> innerFutures = spawnParallelBranches(
                            currentTask.getTaskId(),
                            innerParams,
                            tasks,
                            execution,
                            branchContext,
                            result,
                            definition,
                            graph,
                            joinTaskId,
                            joinBarrier,
                            branchStartTime);

                    drainBranchFutures(innerFutures);

                    currentTaskId = resolveNextTaskId(currentTask, tasks, graph, result);
                    continue;
                }

                if (joinTaskId != null && !joinTaskId.isBlank()
                        && WorkflowTopologyResolver.isInboundForJoin(currentTaskId, joinTaskId, graph)) {
                    JoinTaskExecutionData.BranchResult arrival = JoinTaskExecutionData.BranchResult.builder()
                            .branchName(branch.getBranchName())
                            .status(TaskExecutionStatus.COMPLETED)
                            .tasksExecuted(tasksExecuted)
                            .lastTaskId(lastTaskId)
                            .output(branchOutputs)
                            .build();
                    joinBarrier.recordArrival(joinTaskId, currentTaskId, arrival);
                    return arrival;
                }

                String nextTaskId = resolveNextTaskId(currentTask, tasks, graph, result);

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
