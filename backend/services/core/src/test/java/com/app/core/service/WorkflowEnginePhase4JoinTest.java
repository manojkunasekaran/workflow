package com.app.core.service;

import com.app.common.constant.TaskExecutionStatus;
import com.app.common.constant.WorkflowExecutionStatus;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.model.task.parameters.BranchTaskParameters;
import com.app.common.model.task.parameters.JoinWaitPolicy;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WorkflowEnginePhase4JoinTest extends WorkflowEngineBranchJoinTestSupport {

    @Test
    void sequentialFanIn_recordsSpineInboundBeforeJoin() throws Exception {
        BranchTaskParameters branchParams = new BranchTaskParameters();
        branchParams.setBranches(List.of(
                branchRow("Path B", "task_b"),
                branchRow("Path C", "task_c")));

        WorkflowDefinition definition = WorkflowDefinition.builder()
                .id("def-1")
                .tasks(List.of(
                        httpTask("task_seq"),
                        branchTask("branch_split", "join_merge", branchParams),
                        joinTask("join_merge", List.of("task_seq", "task_b", "task_c"), "task_after"),
                        httpTask("task_b"),
                        httpTask("task_c"),
                        httpTask("task_after")))
                .build();
        definition.getTasks().get(0).setNextTaskId("branch_split");

        runEngine(definition);

        assertEquals(WorkflowExecutionStatus.COMPLETED, execution.getStatus());
        var joinData = joinExecutionData("join_merge");
        assertEquals(3, joinData.getTotalInbounds());
        assertTrue(joinData.getInboundResults().containsKey("task_seq"));
        assertTrue(joinData.getInboundResults().containsKey("task_b"));
        assertTrue(joinData.getInboundResults().containsKey("task_c"));
    }

    @Test
    void waitPolicyAny_proceedsWhenOneInboundArrives() throws Exception {
        BranchTaskParameters branchParams = new BranchTaskParameters();
        branchParams.setBranches(List.of(
                branchRow("Path A", "task_a"),
                branchRow("Path B", "task_b"),
                branchRow("Path C", "task_c")));

        WorkflowDefinition definition = WorkflowDefinition.builder()
                .id("def-1")
                .tasks(List.of(
                        branchTask("branch_split", "join_merge", branchParams),
                        joinTask(
                                "join_merge",
                                List.of("task_a", "task_b", "task_c"),
                                "task_after",
                                JoinWaitPolicy.ANY,
                                null,
                                null),
                        httpTask("task_a"),
                        httpTask("task_b"),
                        httpTask("task_c"),
                        httpTask("task_after")))
                .build();

        runEngine(definition);

        assertEquals(WorkflowExecutionStatus.COMPLETED, execution.getStatus());
        assertEquals(1, countTaskExecutions("join_merge", TaskExecutionStatus.COMPLETED));
        var joinData = joinExecutionData("join_merge");
        assertTrue(joinData.getTotalInbounds() >= 1);
        assertTrue(executedTaskIds().contains("task_after"));
    }

    @Test
    void waitPolicyQuorum_proceedsWhenQuorumReached() throws Exception {
        httpExecutor.setDelayMs("task_b", 80);
        httpExecutor.setDelayMs("task_c", 160);

        BranchTaskParameters branchParams = new BranchTaskParameters();
        branchParams.setBranches(List.of(
                branchRow("Path A", "task_a"),
                branchRow("Path B", "task_b"),
                branchRow("Path C", "task_c")));

        WorkflowDefinition definition = WorkflowDefinition.builder()
                .id("def-1")
                .tasks(List.of(
                        branchTask("branch_split", "join_merge", branchParams),
                        joinTask(
                                "join_merge",
                                List.of("task_a", "task_b", "task_c"),
                                "task_after",
                                JoinWaitPolicy.QUORUM,
                                2,
                                null),
                        httpTask("task_a"),
                        httpTask("task_b"),
                        httpTask("task_c"),
                        httpTask("task_after")))
                .build();

        runEngine(definition);

        assertEquals(WorkflowExecutionStatus.COMPLETED, execution.getStatus());
        var joinData = joinExecutionData("join_merge");
        assertTrue(joinData.getTotalInbounds() >= 2);
        assertTrue(executedTaskIds().contains("task_after"));
    }

    @Test
    void joinPauseResume_waitsForSlowBranchInbound() throws Exception {
        httpExecutor.setDelayMs("task_slow", 250);

        BranchTaskParameters branchParams = new BranchTaskParameters();
        branchParams.setBranches(List.of(branchRow("Slow path", "task_slow")));

        WorkflowDefinition definition = WorkflowDefinition.builder()
                .id("def-1")
                .tasks(List.of(
                        httpTask("task_seq"),
                        branchTask("branch_split", "join_merge", branchParams),
                        joinTask("join_merge", List.of("task_seq", "task_slow"), "task_after"),
                        httpTask("task_slow"),
                        httpTask("task_after")))
                .build();
        definition.getTasks().get(0).setNextTaskId("branch_split");

        long start = System.currentTimeMillis();
        runEngine(definition);
        long elapsed = System.currentTimeMillis() - start;

        assertEquals(WorkflowExecutionStatus.COMPLETED, execution.getStatus());
        assertTrue(elapsed >= 200, "JOIN should wait for slow branch inbound");
        var joinData = joinExecutionData("join_merge");
        assertEquals(2, joinData.getTotalInbounds());
    }

    @Test
    void joinBarrierTimeout_failsWhenPolicyNotMet() throws Exception {
        httpExecutor.setDelayMs("task_slow", 500);

        BranchTaskParameters branchParams = new BranchTaskParameters();
        branchParams.setBranches(List.of(
                branchRow("Fast", "task_fast"),
                branchRow("Slow", "task_slow")));

        WorkflowDefinition definition = WorkflowDefinition.builder()
                .id("def-1")
                .tasks(List.of(
                        branchTask("branch_split", "join_merge", branchParams),
                        joinTask(
                                "join_merge",
                                List.of("task_fast", "task_slow"),
                                "task_after",
                                JoinWaitPolicy.ALL,
                                null,
                                100L),
                        httpTask("task_fast"),
                        httpTask("task_slow"),
                        httpTask("task_after")))
                .build();

        runEngine(definition);

        assertEquals(WorkflowExecutionStatus.FAILED, execution.getStatus());
        assertEquals(0, countTaskExecutions("join_merge", TaskExecutionStatus.COMPLETED));
    }
}
