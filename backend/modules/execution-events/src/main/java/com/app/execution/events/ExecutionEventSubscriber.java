package com.app.execution.events;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

@Slf4j
@Component
public class ExecutionEventSubscriber {

    private final List<Consumer<String>> listeners = new CopyOnWriteArrayList<>();

    public void addListener(Consumer<String> listener) {
        listeners.add(listener);
    }

    public void removeListener(Consumer<String> listener) {
        listeners.remove(listener);
    }

    public void handleMessage(Message message, byte[] pattern) {
        if (message == null || message.getBody() == null) {
            return;
        }
        String payload = new String(message.getBody());
        String channel = pattern != null ? new String(pattern) : "";
        for (Consumer<String> listener : listeners) {
            try {
                listener.accept(payload);
            } catch (Exception e) {
                log.warn("Execution event listener failed on channel {}: {}", channel, e.getMessage());
            }
        }
    }
}
