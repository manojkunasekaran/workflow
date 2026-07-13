package com.app.messaging.dispatch;

import com.app.messaging.rabbit.QueueConstants;
import com.app.messaging.rabbit.WorkflowExecutionMessage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Schedules workflow continuation via a durable Rabbit delay queue.
 * Expired messages dead-letter to the main execution queue for processing.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DelayedExecutionMessageDispatcher {

    private final RabbitTemplate rabbitTemplate;

    public void dispatch(String executionId, long delayMs) {
        if (delayMs < 0) {
            throw new IllegalArgumentException("Wait delay must be non-negative, got: " + delayMs);
        }

        rabbitTemplate.convertAndSend(
                "",
                QueueConstants.TOPIC_WORKFLOW_EXECUTION_DELAY,
                new WorkflowExecutionMessage(executionId, Instant.now()),
                message -> {
                    message.getMessageProperties().setExpiration(String.valueOf(delayMs));
                    return message;
                });

        log.info("Delayed execution message scheduled: executionId={}, delayMs={}", executionId, delayMs);
    }
}
