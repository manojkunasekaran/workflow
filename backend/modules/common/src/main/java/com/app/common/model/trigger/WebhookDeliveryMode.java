package com.app.common.model.trigger;

/**
 * How inbound webhook events are set up for a workflow.
 */
public enum WebhookDeliveryMode {
    /** User pastes the platform URL into the external app. */
    PASSIVE,
    /** Platform calls the vendor register/unregister APIs on save. */
    SUBSCRIBE
}
