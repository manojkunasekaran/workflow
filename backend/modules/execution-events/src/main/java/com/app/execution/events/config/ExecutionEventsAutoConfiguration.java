package com.app.execution.events.config;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.ComponentScan;

@AutoConfiguration
@ConditionalOnProperty(
        name = "workflow.execution-events.enabled",
        havingValue = "true",
        matchIfMissing = true)
@ComponentScan(basePackages = "com.app.execution.events")
public class ExecutionEventsAutoConfiguration {
}
