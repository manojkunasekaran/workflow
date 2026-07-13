package com.app.execution.events.redis;

import com.app.execution.events.ExecutionEventSubscriber;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RedisExecutionEventListener implements MessageListener {

    private final ExecutionEventSubscriber executionEventSubscriber;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        executionEventSubscriber.handleMessage(message, pattern);
    }
}
