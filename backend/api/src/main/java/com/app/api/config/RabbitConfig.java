package com.app.api.config;

import com.app.common.constant.QueueConstants;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Message queue producer configuration.
 * Backed by RabbitMQ with JSON serialization.
 */
@Configuration
public class RabbitConfig {

    public static final String EXCHANGE_WORKFLOW = "workflow.exchange";

    @Bean
    public TopicExchange workflowExchange() {
        return new TopicExchange(EXCHANGE_WORKFLOW);
    }

    @Bean
    public Queue triggerQueue() {
        return new Queue(QueueConstants.TOPIC_WORKFLOW_TRIGGER, true);
    }

    @Bean
    public Queue resumeQueue() {
        return new Queue(QueueConstants.TOPIC_WORKFLOW_RESUME, true);
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
}
