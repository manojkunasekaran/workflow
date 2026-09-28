package com.app.common.model.trigger;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Shared inbound settings for passive {@link WebhookConfig} and managed
 * webhook triggers (passive and subscribe delivery modes).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebhookInboundConfig {

    @Builder.Default
    private WebhookVerificationMode verificationMode = WebhookVerificationMode.NONE;

    /** Header name for {@link WebhookVerificationMode#HEADER_SECRET} or signature header for HMAC. */
    private String headerName;

    /** Optional user-provided secret; platform may also store an encrypted secret on registration. */
    private String secret;

    /** JsonPath to extract a stable event id for deduplication. */
    private String eventIdPath;

    /** Optional JsonPath to extract workflow input payload from the inbound body. */
    private String payloadPath;

    @Builder.Default
    private boolean ignoreDuplicates = true;

    /** Query parameter name used for challenge handshake echo (CHALLENGE mode). */
    private String challengeQueryParam;

    /** Response field or body template for challenge echo (CHALLENGE mode). */
    private String challengeResponseField;
}
