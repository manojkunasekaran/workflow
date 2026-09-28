package com.app.core.service;

import com.app.common.constant.TaskExecutionStatus;
import com.app.common.constant.WorkflowExecutionStatus;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.entity.WorkflowExecution;
import com.app.common.entity.WorkflowTaskExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.JoinTaskExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.BranchTaskParameters;
import com.app.common.model.task.parameters.HttpTaskParameters;
import com.app.common.model.task.parameters.JoinMergeMode;
import com.app.common.model.task.parameters.JoinTaskParameters;
import com.app.common.model.task.parameters.JoinWaitPolicy;
import com.app.core.executors.BranchTaskExecutor;
import com.app.core.executors.JoinTaskExecutor;
import com.app.core.model.ExecutionContext;
import com.app.execution.events.ExecutionEventPublisher;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import com.app.persistence.repository.WorkflowExecutionRepository;
import com.app.persistence.repository.WorkflowTaskExecutionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
abstract class WorkflowEngineBranchJoinTestSupport {

    @Mock
    protected WorkflowDefinitionRepository definitionRepository;

    @Mock
    protected WorkflowExecutionRepository executionRepository;

    @Mock
    protected WorkflowTaskExecutionRepository taskExecutionRepository;

    @Mock
    protected ExecutionEventPublisher eventPublisher;

    protected RecordingHttpTaskExecutor httpExecutor;
    protected WorkflowEngine engine;
    protected WorkflowExecution execution;
    protected List<WorkflowTaskExecution> recordedTaskExecutions;

    @BeforeEach
    void baseSetUp() {
        httpExecutor = new RecordingHttpTaskExecutor();
        engine = new WorkflowEngine(
                List.of(new BranchTaskExecutor(), new JoinTaskExecutor(), httpExecutor),
                executionRepository,
                taskExecutionRepository,
                definitionRepository,
                eventPublisher,
                4,
                8,
                50,
                300_000L);

        recordedTaskExecutions = new ArrayList<>();
        when(taskExecutionRepository.save(any(WorkflowTaskExecution.class))).thenAnswer(invocation -> {
            WorkflowTaskExecution saved = invocation.getArgument(0);
            saved.setId("te-" + recordedTaskExecutions.size());
            recordedTaskExecutions.add(saved);
            return saved;
        });
        when(taskExecutionRepository.findAllByWorkflowExecutionId(any())).thenReturn(List.of());

        execution = new WorkflowExecution();
        execution.setId("exec-1");
        execution.setWorkflowId("wf-1");
        execution.setWorkflowDefinitionId("def-1");
        execution.setStatus(WorkflowExecutionStatus.QUEUED);
        execution.setTaskOutputs(new ConcurrentHashMap<>());
        execution.setTaskExecutionSummaries(new ArrayList<>());

        when(executionRepository.findById("exec-1")).thenReturn(Optional.of(execution));
    }

    protected void runEngine(WorkflowDefinition definition) throws InterruptedException {
        when(definitionRepository.findById("def-1")).thenReturn(Optional.of(definition));
        engine.processExecution("exec-1");
        awaitTerminalStatus(execution, 30_000);
    }

    protected static void awaitTerminalStatus(WorkflowExecution execution, long timeoutMs) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            WorkflowExecutionStatus status = execution.getStatus();
            if (WorkflowExecutionStatus.COMPLETED.equals(status) || WorkflowExecutionStatus.FAILED.equals(status)) {
                return;
            }
            Thread.sleep(50);
        }
        fail("Timed out waiting for execution to finish — status=" + execution.getStatus());
    }

    protected List<String> executedTaskIds() {
        return recordedTaskExecutions.stream()
                .map(WorkflowTaskExecution::getTaskDefinitionId)
                .toList();
    }

    protected long countTaskExecutions(String taskId, TaskExecutionStatus status) {
        return recordedTaskExecutions.stream()
                .filter(record -> taskId.equals(record.getTaskDefinitionId()))
                .filter(record -> status.equals(record.getStatus()))
                .count();
    }

    protected JoinTaskExecutionData joinExecutionData(String joinTaskId) {
        return recordedTaskExecutions.stream()
                .filter(record -> joinTaskId.equals(record.getTaskDefinitionId()))
                .map(WorkflowTaskExecution::getExecutionData)
                .filter(JoinTaskExecutionData.class::isInstance)
                .map(JoinTaskExecutionData.class::cast)
                .findFirst()
                .orElseThrow(() -> new AssertionError("JOIN execution data not found for " + joinTaskId));
    }

    protected static WorkflowTask branchTask(String taskId, String nextTaskId, BranchTaskParameters params) {
        WorkflowTask task = new WorkflowTask();
        task.setTaskId(taskId);
        task.setType(TaskType.BRANCH);
        task.setParameters(params);
        task.setNextTaskId(nextTaskId);
        return task;
    }

    protected static WorkflowTask joinTask(String taskId, List<String> inboundTaskIds, String nextTaskId) {
        return joinTask(taskId, inboundTaskIds, nextTaskId, JoinWaitPolicy.ALL, null, null);
    }

    protected static WorkflowTask joinTask(
            String taskId,
            List<String> inboundTaskIds,
            String nextTaskId,
            JoinWaitPolicy waitPolicy,
            Integer quorumCount,
            Long barrierTimeoutMs) {
        JoinTaskParameters params = JoinTaskParameters.builder()
                .inboundTaskIds(inboundTaskIds)
                .waitPolicy(waitPolicy)
                .quorumCount(quorumCount)
                .barrierTimeoutMs(barrierTimeoutMs)
                .mergeMode(JoinMergeMode.PASS_THROUGH)
                .nextTaskId(nextTaskId)
                .build();

        WorkflowTask task = new WorkflowTask();
        task.setTaskId(taskId);
        task.setType(TaskType.JOIN);
        task.setParameters(params);
        task.setNextTaskId(nextTaskId);
        return task;
    }

    protected static WorkflowTask httpTask(String taskId) {
        WorkflowTask task = new WorkflowTask();
        task.setTaskId(taskId);
        task.setType(TaskType.HTTP_TASK);
        task.setParameters(new HttpTaskParameters());
        return task;
    }

    protected static BranchTaskParameters.ParallelBranch branchRow(String name, String startTaskId) {
        BranchTaskParameters.ParallelBranch row = new BranchTaskParameters.ParallelBranch();
        row.setBranchName(name);
        row.setStartTaskId(startTaskId);
        return row;
    }

    protected static class RecordingHttpTaskExecutor implements TaskExecutor {
        private final Map<String, Long> delayMsByTaskId = new HashMap<>();

        void setDelayMs(String taskId, long delayMs) {
            delayMsByTaskId.put(taskId, delayMs);
        }

        @Override
        public boolean canExecute(TaskType taskType) {
            return TaskType.HTTP_TASK == taskType;
        }

        @Override
        public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
            Long delayMs = delayMsByTaskId.get(task.getTaskId());
            if (delayMs != null && delayMs > 0) {
                try {
                    Thread.sleep(delayMs);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return TaskExecutionResult.builder()
                            .status(TaskExecutionResult.Status.FAILED)
                            .errorMessage("Interrupted during delayed HTTP task")
                            .build();
                }
            }

            Map<String, Object> output = new HashMap<>();
            output.put("taskId", task.getTaskId());
            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.COMPLETED)
                    .output(output)
                    .build();
        }
    }
}
