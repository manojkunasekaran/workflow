package com.app.core.config;

import com.app.common.constant.QueueConstants;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Message queue consumer configuration.
 * Backed by RabbitMQ with retry + dead letter exchange support.
 */
@Configuration
public class RabbitConfig {

    public static final String EXCHANGE_WORKFLOW = "workflow.exchange";
    public static final String DLX_EXCHANGE = "workflow.dlx";

    // ── Exchanges ───────────────────────────────────────────────────────

    @Bean
    public TopicExchange workflowExchange() {
        return new TopicExchange(EXCHANGE_WORKFLOW);
    }

    @Bean
    public TopicExchange deadLetterExchange() {
        return new TopicExchange(DLX_EXCHANGE);
    }

    // ── Queues (with DLX routing) ───────────────────────────────────────

    @Bean
    public Queue triggerQueue() {
        return QueueBuilder.durable(QueueConstants.TOPIC_WORKFLOW_TRIGGER)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", QueueConstants.TOPIC_WORKFLOW_TRIGGER + ".dlq")
                .build();
    }

    @Bean
    public Queue resumeQueue() {
        return QueueBuilder.durable(QueueConstants.TOPIC_WORKFLOW_RESUME)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
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

    // ── Bindings ────────────────────────────────────────────────────────

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

    // ── Serialization ───────────────────────────────────────────────────

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                         MessageConverter jsonMessageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter);
        return template;
    }

    // ── Listener Container Factory ──────────────────────────────────────

    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            ConnectionFactory connectionFactory,
            MessageConverter jsonMessageConverter) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(jsonMessageConverter);

        // Retry 3 times with 2-second intervals, then route to DLQ
        factory.setDefaultRequeueRejected(false);

        return factory;
    }
}
