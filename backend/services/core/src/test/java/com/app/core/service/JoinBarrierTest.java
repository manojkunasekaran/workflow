package com.app.core.service;

import com.app.common.constant.TaskExecutionStatus;
import com.app.common.model.task.execution.JoinTaskExecutionData;
import com.app.common.model.task.parameters.JoinWaitPolicy;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JoinBarrierTest {

    @Test
    void recordArrival_isIdempotentPerInbound() {
        JoinBarrier barrier = new JoinBarrier();
        JoinTaskExecutionData.BranchResult first = result("A");
        JoinTaskExecutionData.BranchResult second = result("A-retry");

        barrier.recordArrival("join", "A", first);
        barrier.recordArrival("join", "A", second);

        Map<String, JoinTaskExecutionData.BranchResult> arrivals = barrier.getArrivals("join");
        assertEquals(1, arrivals.size());
        assertSame(first, arrivals.get("A"));
    }

    @Test
    void isSatisfied_allPolicy_requiresEveryExpectedInbound() {
        JoinBarrier barrier = new JoinBarrier();
        barrier.recordArrival("join", "A", result("A"));
        barrier.recordArrival("join", "C", result("C"));

        assertFalse(barrier.isSatisfied(
                "join",
                JoinWaitPolicy.ALL,
                null,
                List.of("A", "C", "D", "E")));

        barrier.recordArrival("join", "D", result("D"));
        barrier.recordArrival("join", "E", result("E"));

        assertTrue(barrier.isSatisfied(
                "join",
                JoinWaitPolicy.ALL,
                null,
                List.of("A", "C", "D", "E")));
    }

    @Test
    void isSatisfied_anyPolicy_requiresAtLeastOneExpectedInbound() {
        JoinBarrier barrier = new JoinBarrier();

        assertFalse(barrier.isSatisfied(
                "join",
                JoinWaitPolicy.ANY,
                null,
                List.of("A", "B")));

        barrier.recordArrival("join", "B", result("B"));

        assertTrue(barrier.isSatisfied(
                "join",
                JoinWaitPolicy.ANY,
                null,
                List.of("A", "B")));
    }

    @Test
    void isSatisfied_quorumPolicy_requiresConfiguredCount() {
        JoinBarrier barrier = new JoinBarrier();
        barrier.recordArrival("join", "A", result("A"));

        assertFalse(barrier.isSatisfied(
                "join",
                JoinWaitPolicy.QUORUM,
                2,
                List.of("A", "B", "C")));

        barrier.recordArrival("join", "C", result("C"));

        assertTrue(barrier.isSatisfied(
                "join",
                JoinWaitPolicy.QUORUM,
                2,
                List.of("A", "B", "C")));
    }

    @Test
    void isSatisfied_quorumPolicy_requiresQuorumCount() {
        JoinBarrier barrier = new JoinBarrier();

        assertThrows(IllegalArgumentException.class, () -> barrier.isSatisfied(
                "join",
                JoinWaitPolicy.QUORUM,
                null,
                List.of("A")));
    }

    private static JoinTaskExecutionData.BranchResult result(String inboundId) {
        return JoinTaskExecutionData.BranchResult.builder()
                .branchName(inboundId)
                .status(TaskExecutionStatus.COMPLETED)
                .lastTaskId(inboundId)
                .build();
    }
}
