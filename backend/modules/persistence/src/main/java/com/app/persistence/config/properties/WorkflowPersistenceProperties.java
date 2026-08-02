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
}
