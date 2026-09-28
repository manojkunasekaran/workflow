package com.app.persistence.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
@ConditionalOnProperty(
        name = "workflow.persistence.connector.seed-enabled",
        havingValue = "true",
        matchIfMissing = true)
public class ConnectorStartupConfig {
}
