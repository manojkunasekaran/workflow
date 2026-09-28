package com.app.common.model.trigger;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

/**
 * Configuration for a webhook trigger.
 * When active, the platform exposes a stable URL at
 * {@code /webhook-events/{workflowId}} that external systems can POST to
 * in order to start a workflow execution.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebhookConfig {

    @Builder.Default
    private WebhookDeliveryMode deliveryMode = WebhookDeliveryMode.PASSIVE;

    /** Optional path suffix appended after the workflowId. */
    @Builder.Default
    private String path = "";

    /** HTTP method the webhook accepts (default: POST). */
    @Builder.Default
    private String method = "POST";

    /** Whether this webhook is currently accepting requests. */
    @Builder.Default
    private boolean active = true;

    /** Inbound verification, dedup, and payload mapping settings. */
    private WebhookInboundConfig inbound;

    /** Outbound register HTTP (SUBSCRIBE mode only). */
    private PollHttpConfig subscribeHttp;

    /** Outbound unregister HTTP (SUBSCRIBE mode only). */
    private PollHttpConfig unsubscribeHttp;

    /** JsonPath to extract vendor subscription id from subscribe response. */
    private String subscriptionIdPath;

    /** Connector preset selection — studio metadata only. */
    private String connectorId;
    private String connectorTriggerId;
    @Builder.Default
    private Map<String, String> connectorInputs = new HashMap<>();

    public boolean isSubscribeMode() {
        return deliveryMode == WebhookDeliveryMode.SUBSCRIBE;
    }
}
