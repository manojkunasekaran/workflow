package com.app.api.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Data
@Configuration
@ConfigurationProperties(prefix = "workflow.api")
public class WorkflowApiProperties {

    /**
     * Configuration for the distributed cron scheduler.
     */
    private final Scheduler scheduler = new Scheduler();

    @Data
    public static class Scheduler {
        /**
         * How long the distributed lock should be kept in case the executing node dies.
         * Default is 30 seconds.
         */
        private Duration lockAtMostFor = Duration.ofSeconds(30);
        
        /**
         * The distributed lock will be held at least for this duration.
         * Default is 5 seconds.
         */
        private Duration lockAtLeastFor = Duration.ofSeconds(5);
    }


    /**
     * Configuration for workflow executions.
     */
    private final Execution execution = new Execution();

    @Data
    public static class Execution {
        /**
         * Timeout in seconds for synchronous workflow executions.
         * Default is 300 seconds (5 minutes).
         */
        private long syncTimeoutSeconds = 300;
    }
}
