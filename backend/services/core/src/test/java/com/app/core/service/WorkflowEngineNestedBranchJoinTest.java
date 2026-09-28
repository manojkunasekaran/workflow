package com.app.core.service;

import com.app.common.constant.TaskExecutionStatus;
import com.app.common.constant.WorkflowExecutionStatus;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.model.task.parameters.BranchTaskParameters;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WorkflowEngineNestedBranchJoinTest extends WorkflowEngineBranchJoinTestSupport {

    @Test
    void nestedBranchJoin_recordsFourArrivalsAndExecutesJoinOnce() throws Exception {
        BranchTaskParameters innerParams = new BranchTaskParameters();
        innerParams.setBranches(List.of(
                branchRow("Path C", "C"),
                branchRow("Path D", "D")));

        BranchTaskParameters outerParams = new BranchTaskParameters();
        outerParams.setBranches(List.of(
                branchRow("Path A", "A"),
                branchRow("Path Inner", "branch_inner"),
                branchRow("Path E", "E")));

        WorkflowDefinition definition = WorkflowDefinition.builder()
                .id("def-1")
                .tasks(List.of(
                        branchTask("branch_outer", "join_shared", outerParams),
                        joinTask("join_shared", List.of("A", "C", "D", "E"), "NextStep"),
                        branchTask("branch_inner", null, innerParams),
                        httpTask("A"),
                        httpTask("C"),
                        httpTask("D"),
                        httpTask("E"),
                        httpTask("NextStep")))
                .build();

        runEngine(definition);

        assertEquals(WorkflowExecutionStatus.COMPLETED, execution.getStatus());
        assertEquals(1, countTaskExecutions("join_shared", TaskExecutionStatus.COMPLETED));

        Set<String> httpTasks = Set.of("A", "C", "D", "E", "NextStep");
        for (String taskId : httpTasks) {
            assertTrue(executedTaskIds().contains(taskId), "Expected HTTP task " + taskId);
        }

        var joinData = joinExecutionData("join_shared");
        assertEquals(4, joinData.getTotalInbounds());
        assertEquals(4, joinData.getSuccessfulInbounds());
        assertEquals(Set.of("A", "C", "D", "E"), joinData.getInboundResults().keySet());

        Set<String> branchedTasks = recordedTaskExecutions.stream()
                .filter(record -> TaskExecutionStatus.BRANCHED.equals(record.getStatus()))
                .map(record -> record.getTaskDefinitionId())
                .collect(Collectors.toSet());
        assertTrue(branchedTasks.contains("branch_outer"));
        assertTrue(branchedTasks.contains("branch_inner"));
    }
}
