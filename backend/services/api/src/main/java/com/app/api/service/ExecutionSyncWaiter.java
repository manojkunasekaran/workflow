package com.app.api.service;

import com.app.common.constant.WorkflowExecutionStatus;
import com.app.common.entity.WorkflowExecution;
import com.app.common.exception.ValidationException;
import com.app.execution.events.ExecutionEvent;
import com.app.execution.events.ExecutionEventSubscriber;
import com.app.persistence.repository.WorkflowExecutionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.EnumSet;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

@Slf4j
@Component
@RequiredArgsConstructor
public class ExecutionSyncWaiter {

    private static final Set<WorkflowExecutionStatus> WAIT_STATUSES = EnumSet.of(
            WorkflowExecutionStatus.PAUSED,
            WorkflowExecutionStatus.COMPLETED,
            WorkflowExecutionStatus.FAILED);

    private final ExecutionEventSubscriber eventSubscriber;
    private final WorkflowExecutionRepository executionRepository;
    private final ObjectMapper objectMapper;

    public WaitSession beginWait(String executionId) {
        WorkflowExecution initial = executionRepository.findById(executionId)
                .orElseThrow(() -> new ValidationException("Execution not found: " + executionId));

        if (initial.getStatus() != null && WAIT_STATUSES.contains(initial.getStatus())) {
            return WaitSession.alreadyDone(initial);
        }

        CountDownLatch latch = new CountDownLatch(1);
        Consumer<String> listener = payload -> {
            try {
                ExecutionEvent event = objectMapper.readValue(payload, ExecutionEvent.class);
                if (!executionId.equals(event.executionId())) {
                    return;
                }
                if (event.status() != null
                        && WAIT_STATUSES.contains(WorkflowExecutionStatus.valueOf(event.status()))) {
                    latch.countDown();
                }
            } catch (Exception e) {
                log.debug("Ignoring malformed execution event while waiting: {}", e.getMessage());
            }
        };

        eventSubscriber.addListener(listener);
        return new WaitSession(executionId, latch, listener);
    }

    public WorkflowExecution await(WaitSession session, long timeout, TimeUnit unit) {
        if (session.alreadyComplete()) {
            return session.initialExecution();
        }

        try {
            boolean signaled = session.latch().await(timeout, unit);
            if (!signaled) {
                throw new ValidationException(
                        "Sync trigger timed out waiting for execution " + session.executionId());
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ValidationException("Sync trigger interrupted for execution " + session.executionId());
        } finally {
            eventSubscriber.removeListener(session.listener());
        }

        return executionRepository.findById(session.executionId())
                .orElseThrow(() -> new ValidationException("Execution not found: " + session.executionId()));
    }

    public record WaitSession(
            String executionId,
            CountDownLatch latch,
            Consumer<String> listener,
            WorkflowExecution initialExecution,
            boolean alreadyComplete) {

        static WaitSession alreadyDone(WorkflowExecution execution) {
            return new WaitSession(execution.getId(), null, null, execution, true);
        }

        WaitSession(String executionId, CountDownLatch latch, Consumer<String> listener) {
            this(executionId, latch, listener, null, false);
        }
    }
}
