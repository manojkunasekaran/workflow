package com.app.api.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Controlled failure for public inbound MCP server requests.
 */
@Getter
public class McpInboundException extends RuntimeException {

    private final HttpStatus status;

    public McpInboundException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }
}
