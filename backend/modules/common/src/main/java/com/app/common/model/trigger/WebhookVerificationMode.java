package com.app.common.model.trigger;

/**
 * How inbound webhook events are authenticated before triggering a workflow.
 */
public enum WebhookVerificationMode {
    /** No verification — accept any request matching the callback token. */
    NONE,
    /** Shared secret sent in a named HTTP header. */
    HEADER_SECRET,
    /** HMAC-SHA256 signature in a named HTTP header. */
    HMAC_SHA256,
    /** Challenge/response handshake (typically GET with echo query param). */
    CHALLENGE
}
