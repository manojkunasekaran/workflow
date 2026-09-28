package com.app.core.service;

import com.app.common.constant.TaskExecutionStatus;
import com.app.common.constant.WorkflowExecutionStatus;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.model.task.parameters.BranchTaskParameters;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WorkflowEngineBranchJoinTest extends WorkflowEngineBranchJoinTestSupport {

    @Test
    void flatBranchJoin_waitPolicyAll_executesJoinOnceAndContinues() throws Exception {
        BranchTaskParameters branchParams = new BranchTaskParameters();
        branchParams.setBranches(List.of(
                branchRow("Left", "task_left"),
                branchRow("Right", "task_right")));

        WorkflowDefinition definition = WorkflowDefinition.builder()
                .id("def-1")
                .tasks(List.of(
                        branchTask("branch_split", "join_merge", branchParams),
                        joinTask("join_merge", List.of("task_left", "task_right"), "task_after"),
                        httpTask("task_left"),
                        httpTask("task_right"),
                        httpTask("task_after")))
                .build();

        runEngine(definition);

        assertEquals(WorkflowExecutionStatus.COMPLETED, execution.getStatus());
        assertEquals(1, countTaskExecutions("join_merge", TaskExecutionStatus.COMPLETED));
        assertTrue(executedTaskIds().contains("task_left"));
        assertTrue(executedTaskIds().contains("task_right"));
        assertTrue(executedTaskIds().contains("task_after"));

        var joinData = joinExecutionData("join_merge");
        assertEquals(2, joinData.getTotalInbounds());
        assertEquals(2, joinData.getSuccessfulInbounds());
        assertTrue(joinData.getInboundResults().containsKey("task_left"));
        assertTrue(joinData.getInboundResults().containsKey("task_right"));
    }
}
