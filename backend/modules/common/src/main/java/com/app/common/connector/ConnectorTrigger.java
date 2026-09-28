package com.app.common.connector;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Declarative app-event preset for poll or managed webhook subscribe triggers.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConnectorTrigger {
    private String triggerId;
    private String displayName;
    private String description;
    private ConnectorTriggerType triggerType;
    @Builder.Default
    private List<ConnectorInputField> inputSchema = new ArrayList<>();
    private ConnectorTriggerPreset preset;
}
