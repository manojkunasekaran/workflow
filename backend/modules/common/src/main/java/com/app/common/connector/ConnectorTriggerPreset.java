package com.app.common.connector;

import com.app.common.model.trigger.PollConfig;
import com.app.common.model.trigger.WebhookConfig;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Pre-filled trigger configuration merged into the workflow trigger on selection.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConnectorTriggerPreset {
    private PollConfig poll;
    private WebhookConfig webhook;
}
