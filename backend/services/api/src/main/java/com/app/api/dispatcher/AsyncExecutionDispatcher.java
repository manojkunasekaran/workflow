package com.app.api.dispatcher;

import com.app.common.constant.ExecutionType;
import com.app.common.constant.WorkflowExecutionStatus;
import com.app.common.entity.WorkflowExecution;
import com.app.messaging.rabbit.QueueConstants;
import com.app.messaging.rabbit.RabbitMessagingNames;
import com.app.messaging.rabbit.WorkflowTriggerMessage;
import com.app.common.model.variable.VariableValue;
import com.app.persistence.repository.WorkflowExecutionRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;

/**
 * Async execution dispatcher — creates a {@code QUEUED} execution and
 * publishes a trigger message to the message queue (RabbitMQ).
 * <p>
 * To swap the queue technology, replace the {@link queueMessageTemplate} usage
 * with the desired queue client.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AsyncExecutionDispatcher implements ExecutionTriggerDispatcher {

    private final WorkflowExecutionRepository executionRepository;
    private final RabbitTemplate queueMessageTemplate;

    @Override
    public ExecutionType getType() {
        return ExecutionType.ASYNC;
    }

    @Override
    public WorkflowExecution dispatch(String definitionId, Map<String, VariableValue> inputs) {
        // Create execution record with QUEUED status
        WorkflowExecution execution = createExecution(definitionId, inputs);

        // Publish trigger message to queue
        WorkflowTriggerMessage message = new WorkflowTriggerMessage(
                execution.getId(),
                definitionId,
                Instant.now());

        queueMessageTemplate.convertAndSend(
                RabbitMessagingNames.EXCHANGE_WORKFLOW,
                QueueConstants.TOPIC_WORKFLOW_TRIGGER,
                message);

        log.info("Dispatched async trigger: executionId={}, definitionId={}",
                execution.getId(), definitionId);

        return execution;
    }

    private WorkflowExecution createExecution(String definitionId, Map<String, VariableValue> inputs) {
        WorkflowExecution execution = new WorkflowExecution();
        execution.setWorkflowId(definitionId);
        execution.setWorkflowDefinitionId(definitionId);
        execution.setExecutionType(ExecutionType.ASYNC);
        execution.setStatus(WorkflowExecutionStatus.QUEUED);
        execution.setStartTime(Instant.now());
        execution.setTaskExecutionSummaries(Collections.synchronizedList(new ArrayList<>()));

        if (inputs != null) {
            execution.setTriggerInputs(inputs);
        }

        return executionRepository.save(execution);
    }
}
