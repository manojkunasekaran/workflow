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
    public Queue triggerQueue() {
        return QueueBuilder.durable(QueueConstants.TOPIC_WORKFLOW_TRIGGER)
                .withArgument("x-dead-letter-exchange", RabbitMessagingNames.DLX_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", QueueConstants.TOPIC_WORKFLOW_TRIGGER + ".dlq")
                .build();
    }

    @Bean
    public Queue resumeQueue() {
        return QueueBuilder.durable(QueueConstants.TOPIC_WORKFLOW_RESUME)
                .withArgument("x-dead-letter-exchange", RabbitMessagingNames.DLX_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", QueueConstants.TOPIC_WORKFLOW_RESUME + ".dlq")
                .build();
    }

    @Bean
    public Queue triggerDlq() {
        return QueueBuilder.durable(QueueConstants.TOPIC_WORKFLOW_TRIGGER + ".dlq").build();
    }

    @Bean
    public Queue resumeDlq() {
        return QueueBuilder.durable(QueueConstants.TOPIC_WORKFLOW_RESUME + ".dlq").build();
    }

    @Bean
    public Binding triggerBinding(Queue triggerQueue, TopicExchange workflowExchange) {
        return BindingBuilder.bind(triggerQueue)
                .to(workflowExchange)
                .with(QueueConstants.TOPIC_WORKFLOW_TRIGGER);
    }

    @Bean
    public Binding resumeBinding(Queue resumeQueue, TopicExchange workflowExchange) {
        return BindingBuilder.bind(resumeQueue)
                .to(workflowExchange)
                .with(QueueConstants.TOPIC_WORKFLOW_RESUME);
    }

    @Bean
    public Binding triggerDlqBinding(Queue triggerDlq, TopicExchange deadLetterExchange) {
        return BindingBuilder.bind(triggerDlq)
                .to(deadLetterExchange)
                .with(QueueConstants.TOPIC_WORKFLOW_TRIGGER + ".dlq");
    }

    @Bean
    public Binding resumeDlqBinding(Queue resumeDlq, TopicExchange deadLetterExchange) {
        return BindingBuilder.bind(resumeDlq)
                .to(deadLetterExchange)
                .with(QueueConstants.TOPIC_WORKFLOW_RESUME + ".dlq");
    }
}
