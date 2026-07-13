package com.app.messaging.dispatch;

import com.app.common.constant.ExecutionType;
import com.app.messaging.rabbit.QueueConstants;
import com.app.messaging.rabbit.RabbitMessagingNames;
import com.app.messaging.rabbit.WorkflowExecutionMessage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Slf4j
@Component
@RequiredArgsConstructor
public class AsyncExecutionMessageDispatcher implements ExecutionMessageDispatcher {

    private final RabbitTemplate rabbitTemplate;

    @Override
    public ExecutionType getType() {
        return ExecutionType.ASYNC;
    }

    @Override
    public void dispatch(String executionId) {
        rabbitTemplate.convertAndSend(
                RabbitMessagingNames.EXCHANGE_WORKFLOW,
                QueueConstants.TOPIC_WORKFLOW_EXECUTION,
                new WorkflowExecutionMessage(executionId, Instant.now()));
        log.info("Async message dispatch: executionId={}", executionId);
    }
}
