package com.app.persistence.config;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@AutoConfiguration
@ConditionalOnProperty(
        name = "workflow.persistence.enabled",
        havingValue = "true",
        matchIfMissing = true)
@EnableMongoRepositories(basePackages = "com.app.persistence.repository")
@EnableMongoAuditing
public class PersistenceAutoConfiguration {
}
