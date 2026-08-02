package com.app.execution.events.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "workflow.execution-events")
public class WorkflowExecutionEventsProperties {

    /**
     * Whether the execution-events module auto-configuration should be enabled.
     * Default is true.
     */
    private boolean enabled = true;
}
