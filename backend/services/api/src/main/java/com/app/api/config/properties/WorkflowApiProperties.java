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

    /**
     * Configuration for poll triggers.
     */
    private final Poll poll = new Poll();

    /**
     * Configuration for webhook triggers (passive receive and managed subscribe).
     */
    private final Webhook webhook = new Webhook();

    @Data
    public static class Poll {
        /** Minimum allowed poll interval in seconds. */
        private long minIntervalSeconds = 30;

        /** Maximum allowed poll interval in seconds (24 hours). */
        private long maxIntervalSeconds = 86400;

        /** Platform cap on items processed per poll cycle. */
        private int maxItemsPerPoll = 1000;

        /** Maximum number of seen item keys retained in poll state. */
        private int maxTrackedKeys = 10000;

        /** Consecutive poll failures before registration moves to ERROR status. */
        private int maxConsecutiveFailures = 5;
    }

    @Data
    public static class Webhook {
        /** Public API base URL used to build callback URLs (e.g. https://api.example.com/rest). */
        private String publicBaseUrl = "http://localhost:8080/rest";

        /** Number of random bytes encoded into each callback token. */
        private int tokenLength = 32;

        /** Retention window for inbound event deduplication records. */
        private int dedupTtlDays = 7;

        /** Consecutive inbound failures before registration moves to ERROR status. */
        private int maxConsecutiveFailures = 5;
    }
}
