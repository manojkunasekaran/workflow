package com.app.api.service.poll;

import lombok.Builder;
import lombok.Data;

/**
 * Result of an HTTP poll fetch.
 */
@Data
@Builder
public class PollHttpResult {
    private boolean success;
    private int statusCode;
    private long durationMs;
    private Object body;
    private String rawBody;
    private String error;
    /** True when the server returned 304 Not Modified. */
    @Builder.Default
    private boolean notModified = false;
    /** ETag from the response, when present. */
    private String etag;
}
