package com.app.common.model.trigger;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

/**
 * HTTP request configuration for a poll trigger.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PollHttpConfig {

    private String url;

    @Builder.Default
    private String method = "GET";

    @Builder.Default
    private Map<String, String> headers = new HashMap<>();

    private String body;

    @Builder.Default
    private Integer timeoutMs = 30000;

    /** Optional integration credential ID for auth headers. */
    private String credentialId;
}
