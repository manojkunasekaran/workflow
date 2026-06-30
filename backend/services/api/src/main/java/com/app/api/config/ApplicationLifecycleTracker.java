package com.app.api.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Slf4j
@Component
public class ApplicationLifecycleTracker {

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        log.info("Application started successfully at {}", LocalDateTime.now());
        log.info("System Version: {}", System.getProperty("os.version"));
        log.info("Java Version: {}", System.getProperty("java.version"));
    }

    @EventListener(ContextClosedEvent.class)
    public void onContextClosed() {
        log.info("Application is shutting down at {}", LocalDateTime.now());
    }
}
