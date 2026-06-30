package com.app.messaging.rabbit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.amqp.rabbit.listener.RabbitListenerEndpointRegistry;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicBoolean;

@Slf4j
@Component
@ConditionalOnBean(RabbitAdmin.class)
@RequiredArgsConstructor
public class RabbitDeferredStartup {

    private final RabbitAdmin rabbitAdmin;
    private final ObjectProvider<RabbitListenerEndpointRegistry> listenerRegistry;
    private final AtomicBoolean started = new AtomicBoolean(false);

    @Scheduled(fixedDelayString = "${workflow.rabbit.retry-interval-ms:5000}")
    public void ensureStarted() {
        if (started.get()) {
            return;
        }
        try {
            rabbitAdmin.initialize();
            listenerRegistry.ifAvailable(registry -> {
                if (!registry.isRunning()) {
                    registry.start();
                }
            });
            started.set(true);
            log.info("RabbitMQ topology and listeners are active");
        } catch (Exception ex) {
            log.warn("RabbitMQ unavailable, will retry: {}", ex.getMessage());
        }
    }
}
