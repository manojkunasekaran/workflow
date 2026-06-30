package com.app.messaging.config;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.ComponentScan;

@AutoConfiguration
@ConditionalOnProperty(
        name = "workflow.messaging.enabled",
        havingValue = "true",
        matchIfMissing = true)
@ComponentScan(basePackages = "com.app.messaging")
public class MessagingAutoConfiguration {
}
