package com.app.persistence.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "workflow.persistence")
public class WorkflowPersistenceProperties {

    /**
     * Whether the persistence module auto-configuration should be enabled.
     * Default is true.
     */
    private boolean enabled = true;

    private final Connector connector = new Connector();

    @Data
    public static class Connector {
        /**
         * Whether to seed system connector manifests from classpath after startup.
         */
        private boolean seedEnabled = true;

        /**
         * Delay in milliseconds before the first seed attempt once scheduling is active.
         */
        private long seedInitialDelayMs = 0;

        /**
         * Interval in milliseconds between seed retries when the database is unavailable.
         */
        private long seedRetryIntervalMs = 5000;
    }
}
