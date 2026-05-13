package com.app.core.inbound;

import com.app.common.constant.QueueConstants;
import com.app.common.message.WorkflowResumeMessage;
import com.app.common.message.WorkflowTriggerMessage;
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

        @RabbitListener(queues = QueueConstants.TOPIC_WORKFLOW_TRIGGER)
        public void handleTrigger(WorkflowTriggerMessage message) {
                log.info("Received async trigger message: definitionId={}, executionId={}",
                                message.workflowDefinitionId(), message.executionId());

                workflowEngine.triggerWorkflow(
                                message.workflowDefinitionId(),
                                message.executionId(),
                                null);
        }

        @RabbitListener(queues = QueueConstants.TOPIC_WORKFLOW_RESUME)
        public void handleResume(WorkflowResumeMessage message) {
                log.info("Received async resume message: executionId={}", message.executionId());

                workflowEngine.resumeWorkflow(
                                message.executionId(),
                                null,
                                message.taskOutputs());
        }
}
