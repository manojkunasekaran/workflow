package com.app.core.service;

import com.app.common.model.task.execution.JoinTaskExecutionData;
import com.app.common.model.task.parameters.JoinWaitPolicy;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-execution in-memory join fan-in barrier keyed by join task ID.
 */
public final class JoinBarrier {

    private final Map<String, Map<String, JoinTaskExecutionData.BranchResult>> arrivals = new ConcurrentHashMap<>();

    /**
     * Records an inbound arrival. Duplicate recordings for the same inbound are ignored.
     */
    public void recordArrival(
            String joinTaskId,
            String inboundTaskId,
            JoinTaskExecutionData.BranchResult result) {
        if (joinTaskId == null || joinTaskId.isBlank()
                || inboundTaskId == null || inboundTaskId.isBlank()
                || result == null) {
            return;
        }
        arrivals.computeIfAbsent(joinTaskId, ignored -> new ConcurrentHashMap<>())
                .putIfAbsent(inboundTaskId, result);
    }

    public Map<String, JoinTaskExecutionData.BranchResult> getArrivals(String joinTaskId) {
        if (joinTaskId == null || joinTaskId.isBlank()) {
            return Map.of();
        }
        Map<String, JoinTaskExecutionData.BranchResult> joinArrivals = arrivals.get(joinTaskId);
        if (joinArrivals == null || joinArrivals.isEmpty()) {
            return Map.of();
        }
        return Collections.unmodifiableMap(joinArrivals);
    }

    /**
     * Returns whether the configured wait policy is satisfied for the expected inbound set.
     */
    public boolean isSatisfied(
            String joinTaskId,
            JoinWaitPolicy waitPolicy,
            Integer quorumCount,
            List<String> expectedInbounds) {
        if (expectedInbounds == null || expectedInbounds.isEmpty()) {
            return false;
        }

        int arrivalCount = countArrivals(joinTaskId, expectedInbounds);
        JoinWaitPolicy policy = waitPolicy != null ? waitPolicy : JoinWaitPolicy.ALL;

        return switch (policy) {
            case ALL -> arrivalCount == expectedInbounds.size();
            case ANY -> arrivalCount >= 1;
            case QUORUM -> {
                if (quorumCount == null || quorumCount < 1) {
                    throw new IllegalArgumentException(
                            "quorumCount is required and must be >= 1 when waitPolicy is QUORUM");
                }
                yield arrivalCount >= quorumCount;
            }
        };
    }

    /**
     * Counts arrivals for the given join that match the expected inbound set.
     */
    public int countArrivals(String joinTaskId, List<String> expectedInbounds) {
        if (expectedInbounds == null || expectedInbounds.isEmpty()) {
            return 0;
        }
        Map<String, JoinTaskExecutionData.BranchResult> joinArrivals =
                arrivals.getOrDefault(joinTaskId, Map.of());
        int count = 0;
        for (String inboundTaskId : expectedInbounds) {
            if (joinArrivals.containsKey(inboundTaskId)) {
                count++;
            }
        }
        return count;
    }
}
