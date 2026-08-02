package com.app.messaging.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "workflow.messaging")
public class WorkflowMessagingProperties {

    /**
     * Whether the messaging module auto-configuration should be enabled.
     * Default is true.
     */
    private boolean enabled = true;

    private final Rabbit rabbit = new Rabbit();
    private final Execution execution = new Execution();

    @Data
    public static class Rabbit {
        /**
         * Interval in milliseconds to wait before retrying RabbitMQ topology startup.
         * Default is 5000ms.
         */
        private long retryIntervalMs = 5000;
    }

    @Data
    public static class Execution {
        /**
         * Timeout in seconds for synchronous workflow executions via gRPC.
         * Default is 300 seconds.
         */
        private long syncTimeoutSeconds = 300;
    }
}
