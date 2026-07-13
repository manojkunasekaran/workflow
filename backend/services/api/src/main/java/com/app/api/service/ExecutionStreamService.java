package com.app.api.service;

import com.app.execution.events.ExecutionEvent;
import com.app.execution.events.ExecutionEventSubscriber;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExecutionStreamService {

    private final ExecutionEventSubscriber eventSubscriber;
    private final ObjectMapper objectMapper;
    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String executionId) {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.put(executionId, emitter);

        Consumer<String> listener = payload -> forwardIfMatch(executionId, emitter, payload);
        eventSubscriber.addListener(listener);

        emitter.onCompletion(() -> cleanup(executionId, listener));
        emitter.onTimeout(() -> cleanup(executionId, listener));
        emitter.onError(ex -> cleanup(executionId, listener));

        return emitter;
    }

    public void sendSnapshot(SseEmitter emitter, ExecutionEvent event) throws IOException {
        emitter.send(SseEmitter.event()
                .name("execution")
                .data(objectMapper.writeValueAsString(event)));
    }

    private void forwardIfMatch(String executionId, SseEmitter emitter, String payload) {
        try {
            ExecutionEvent event = objectMapper.readValue(payload, ExecutionEvent.class);
            if (!executionId.equals(event.executionId())) {
                return;
            }
            emitter.send(SseEmitter.event()
                    .name("execution")
                    .data(payload));
        } catch (Exception e) {
            log.debug("Failed to forward SSE for {}: {}", executionId, e.getMessage());
        }
    }

    private void cleanup(String executionId, Consumer<String> listener) {
        eventSubscriber.removeListener(listener);
        emitters.remove(executionId);
    }
}
