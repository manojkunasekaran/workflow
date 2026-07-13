package com.app.execution.events.redis;

import com.app.execution.events.ExecutionEventChannels;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

@Configuration
@ConditionalOnProperty(name = "workflow.execution-events.enabled", havingValue = "true", matchIfMissing = true)
public class RedisExecutionEventConfig {

    @Bean
    RedisMessageListenerContainer executionEventListenerContainer(
            RedisConnectionFactory connectionFactory,
            RedisExecutionEventListener redisExecutionEventListener) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(
                redisExecutionEventListener,
                new PatternTopic(ExecutionEventChannels.PATTERN));
        return container;
    }
}
