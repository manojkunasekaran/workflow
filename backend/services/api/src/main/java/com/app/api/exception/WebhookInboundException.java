package com.app.api.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Controlled failure for public webhook inbound requests without leaking internals.
 */
@Getter
public class WebhookInboundException extends RuntimeException {

    private final HttpStatus status;

    public WebhookInboundException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }
}
