package com.app.persistence.connector;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Seeds system connector manifests after the application context is ready, without blocking startup.
 * Retries on failure until MongoDB is reachable, matching the RabbitMQ deferred startup pattern.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(
        name = "workflow.persistence.connector.seed-enabled",
        havingValue = "true",
        matchIfMissing = true)
public class ConnectorManifestDeferredStartup {

    private final SystemConnectorManifestSeeder systemConnectorManifestSeeder;
    private final AtomicBoolean seeded = new AtomicBoolean(false);

    @Scheduled(
            initialDelayString = "${workflow.persistence.connector.seed-initial-delay-ms:0}",
            fixedDelayString = "${workflow.persistence.connector.seed-retry-interval-ms:5000}")
    public void ensureSeeded() {
        if (seeded.get()) {
            return;
        }
        try {
            systemConnectorManifestSeeder.seedSystemManifests();
            seeded.set(true);
            log.info("System connector manifests are seeded");
        } catch (Exception ex) {
            log.warn("Connector manifest seeding unavailable, will retry: {}", ex.getMessage());
        }
    }
}
