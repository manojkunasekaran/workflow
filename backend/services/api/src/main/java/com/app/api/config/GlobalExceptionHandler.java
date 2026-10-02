package com.app.api.config;

import com.app.api.dto.ApiErrorResponse;
import com.app.api.exception.McpInboundException;
import com.app.api.exception.WebhookInboundException;
import com.app.common.constant.ResponseStatus;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.exception.ValidationException;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleResourceNotFound(ResourceNotFoundException ex) {
        log.warn("Resource not found: {}", ex.getMessage());
        ApiErrorResponse response = ApiErrorResponse.builder()
                .status(ResponseStatus.FAILURE)
                .errorCode("RESOURCE_NOT_FOUND")
                .error("Not Found")
                .message(ex.getMessage())
                .build();
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(ValidationException ex) {
        log.warn("Validation error: {}", ex.getMessage());
        ApiErrorResponse response = ApiErrorResponse.builder()
                .status(ResponseStatus.FAILURE)
                .errorCode("VALIDATION_ERROR")
                .error("Bad Request")
                .message(ex.getMessage())
                .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNoResourceFound(NoResourceFoundException ex) {
        log.warn("Resource not found: {}", ex.getMessage());
        ApiErrorResponse response = ApiErrorResponse.builder()
                .status(ResponseStatus.FAILURE)
                .errorCode("RESOURCE_NOT_FOUND")
                .error("Not Found")
                .message("Not Found")
                .build();
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(McpInboundException.class)
    public ResponseEntity<ApiErrorResponse> handleMcpInbound(McpInboundException ex) {
        log.warn("MCP inbound rejected: {}", ex.getMessage());
        ApiErrorResponse response = ApiErrorResponse.builder()
                .status(ResponseStatus.FAILURE)
                .errorCode("MCP_INBOUND_REJECTED")
                .error(ex.getStatus().getReasonPhrase())
                .message(ex.getMessage())
                .build();
        return ResponseEntity.status(ex.getStatus()).body(response);
    }

    @ExceptionHandler(WebhookInboundException.class)
    public ResponseEntity<ApiErrorResponse> handleWebhookInbound(WebhookInboundException ex) {
        log.warn("Webhook inbound rejected: {}", ex.getMessage());
        ApiErrorResponse response = ApiErrorResponse.builder()
                .status(ResponseStatus.FAILURE)
                .errorCode("WEBHOOK_INBOUND_REJECTED")
                .error(ex.getStatus().getReasonPhrase())
                .message(ex.getMessage())
                .build();
        return ResponseEntity.status(ex.getStatus()).body(response);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Bad request: {}", ex.getMessage());
        ApiErrorResponse response = ApiErrorResponse.builder()
                .status(ResponseStatus.FAILURE)
                .errorCode("BAD_REQUEST")
                .error("Bad Request")
                .message(ex.getMessage())
                .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGeneral(Exception ex) {
        log.error("Unexpected error: {}", ex.getMessage(), ex);
        ApiErrorResponse response = ApiErrorResponse.builder()
                .status(ResponseStatus.FAILURE)
                .errorCode("INTERNAL_ERROR")
                .error("Internal Server Error")
                .message("An unexpected error occurred")
                .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
