package com.app.messaging.rabbit;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitTopologyConfig {

    @Bean
    public TopicExchange workflowExchange() {
        return new TopicExchange(RabbitMessagingNames.EXCHANGE_WORKFLOW);
    }

    @Bean
    public TopicExchange deadLetterExchange() {
        return new TopicExchange(RabbitMessagingNames.DLX_EXCHANGE);
    }

    @Bean
    public Queue executionQueue() {
        return QueueBuilder.durable(QueueConstants.TOPIC_WORKFLOW_EXECUTION)
                .withArgument("x-dead-letter-exchange", RabbitMessagingNames.DLX_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", QueueConstants.TOPIC_WORKFLOW_EXECUTION + ".dlq")
                .build();
    }

    @Bean
    public Queue executionDelayQueue() {
        return QueueBuilder.durable(QueueConstants.TOPIC_WORKFLOW_EXECUTION_DELAY)
                .withArgument("x-dead-letter-exchange", RabbitMessagingNames.EXCHANGE_WORKFLOW)
                .withArgument("x-dead-letter-routing-key", QueueConstants.TOPIC_WORKFLOW_EXECUTION)
                .build();
    }

    @Bean
    public Queue executionDlq() {
        return QueueBuilder.durable(QueueConstants.TOPIC_WORKFLOW_EXECUTION + ".dlq").build();
    }

    @Bean
    public Binding executionBinding(Queue executionQueue, TopicExchange workflowExchange) {
        return BindingBuilder.bind(executionQueue)
                .to(workflowExchange)
                .with(QueueConstants.TOPIC_WORKFLOW_EXECUTION);
    }

    @Bean
    public Binding executionDlqBinding(Queue executionDlq, TopicExchange deadLetterExchange) {
        return BindingBuilder.bind(executionDlq)
                .to(deadLetterExchange)
                .with(QueueConstants.TOPIC_WORKFLOW_EXECUTION + ".dlq");
    }
}
