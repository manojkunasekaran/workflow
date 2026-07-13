package com.app.core.inbound;

import com.app.messaging.rabbit.QueueConstants;
import com.app.messaging.rabbit.WorkflowExecutionMessage;
import com.app.core.service.WorkflowEngine;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Asynchronous inbound adapter for the workflow engine.
 * Receives workflow triggers and resume commands from the message queue (RabbitMQ)
 * and delegates processing to the {@link WorkflowEngine}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AsyncWorkflowConsumer {

    private final WorkflowEngine workflowEngine;

    @RabbitListener(queues = QueueConstants.TOPIC_WORKFLOW_EXECUTION)
    public void handleExecution(WorkflowExecutionMessage message) {
        log.info("Received execution message: executionId={}", message.executionId());
        workflowEngine.processExecution(message.executionId());
    }
}
