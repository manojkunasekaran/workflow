package com.app.api.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Response from the connector test endpoint.
 */
@Data
@Builder
public class ConnectorTestResult {
    /** Whether the API returned a 2xx response. */
    private boolean success;

    /** HTTP status code from the downstream API. */
    private int statusCode;

    /** Wall-clock time of the full round-trip in milliseconds. */
    private long durationMs;

    /**
     * Parsed response body from the downstream API.
     * May be a {@code Map}, {@code List}, or plain {@code String} depending
     * on what the API returned.
     */
    private Object response;

    /**
     * Error message if the call failed (non-2xx, network error, or bad config).
     * Null on success.
     */
    private String error;
}
