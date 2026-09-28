package com.app.core.executors;

import com.app.common.constant.TaskExecutionStatus;
import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.JoinTaskExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.JoinMergeMode;
import com.app.common.model.task.parameters.JoinTaskParameters;
import com.app.core.model.ExecutionContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JoinTaskExecutorTest {

    private JoinTaskExecutor executor;
    private WorkflowExecution execution;
    private ExecutionContext context;

    @BeforeEach
    void setUp() {
        executor = new JoinTaskExecutor();
        execution = new WorkflowExecution();
        context = ExecutionContext.builder()
                .taskOutputs(new HashMap<>())
                .build();
    }

    @Test
    void passThrough_mergeMode_flattensInboundOutputs() {
        injectArrivals(Map.of(
                "task_a", arrival("task_a", Map.of("alpha", 1)),
                "task_b", arrival("task_b", Map.of("beta", 2))));

        TaskExecutionResult result = executor.execute(joinTask(JoinMergeMode.PASS_THROUGH), execution, context);

        assertEquals(TaskExecutionResult.Status.COMPLETED, result.getStatus());
        assertEquals(1, result.getOutput().get("alpha"));
        assertEquals(2, result.getOutput().get("beta"));
        assertTrue(!result.getOutput().containsKey("inbounds"));

        JoinTaskExecutionData data = assertInstanceOf(JoinTaskExecutionData.class, result.getExecutionData());
        assertEquals(JoinMergeMode.PASS_THROUGH, data.getMergeMode());
        assertEquals(List.of("task_a", "task_b"), data.getExpectedInboundIds());
        assertEquals(List.of("task_a", "task_b"), data.getArrivedInboundIds());
    }

    @Test
    void collectOutputs_mergeMode_preservesPerInboundOutputs() {
        injectArrivals(Map.of(
                "task_a", arrival("task_a", Map.of("alpha", 1)),
                "task_b", arrival("task_b", Map.of("beta", 2))));

        TaskExecutionResult result = executor.execute(joinTask(JoinMergeMode.COLLECT_OUTPUTS), execution, context);

        assertEquals(TaskExecutionResult.Status.COMPLETED, result.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> inbounds = (Map<String, Object>) result.getOutput().get("inbounds");
        assertEquals(Map.of("alpha", 1), inbounds.get("task_a"));
        assertEquals(Map.of("beta", 2), inbounds.get("task_b"));
        assertTrue(!result.getOutput().containsKey("alpha"));

        JoinTaskExecutionData data = assertInstanceOf(JoinTaskExecutionData.class, result.getExecutionData());
        assertEquals(JoinMergeMode.COLLECT_OUTPUTS, data.getMergeMode());
    }

    @Test
    void failsWhenAllInboundsFailed() {
        injectArrivals(Map.of(
                "task_a", failedArrival("task_a", "boom")));

        TaskExecutionResult result = executor.execute(joinTask(JoinMergeMode.PASS_THROUGH), execution, context);

        assertEquals(TaskExecutionResult.Status.FAILED, result.getStatus());
        assertEquals("boom", result.getErrorMessage());
    }

    private void injectArrivals(Map<String, JoinTaskExecutionData.BranchResult> arrivals) {
        context.getTaskOutputs().put("__joinArrivals__join_1", arrivals);
        context.getTaskOutputs().put("__joinStartTime__join_1", Instant.now());
    }

    private static WorkflowTask joinTask(JoinMergeMode mergeMode) {
        WorkflowTask task = new WorkflowTask();
        task.setTaskId("join_1");
        task.setType(TaskType.JOIN);
        task.setParameters(JoinTaskParameters.builder()
                .inboundTaskIds(List.of("task_a", "task_b"))
                .mergeMode(mergeMode)
                .nextTaskId("next")
                .build());
        return task;
    }

    private static JoinTaskExecutionData.BranchResult arrival(String inboundId, Map<String, Object> output) {
        return JoinTaskExecutionData.BranchResult.builder()
                .branchName(inboundId)
                .status(TaskExecutionStatus.COMPLETED)
                .lastTaskId(inboundId)
                .output(output)
                .build();
    }

    private static JoinTaskExecutionData.BranchResult failedArrival(String inboundId, String error) {
        return JoinTaskExecutionData.BranchResult.builder()
                .branchName(inboundId)
                .status(TaskExecutionStatus.FAILED)
                .lastTaskId(inboundId)
                .errorMessage(error)
                .build();
    }
}
