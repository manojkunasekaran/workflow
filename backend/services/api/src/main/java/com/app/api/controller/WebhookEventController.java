package com.app.api.controller;

import com.app.api.exception.WebhookInboundException;
import com.app.api.service.webhook.WebhookEventVerifier;
import com.app.api.service.webhook.WebhookInboundExecutionService;
import com.app.api.service.webhook.WebhookInboundResolver;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public inbound webhook entry point for passive receive and managed subscribe triggers.
 */
@Slf4j
@RestController
@RequestMapping("/webhook-events")
@RequiredArgsConstructor
public class WebhookEventController {

    private final WebhookInboundResolver inboundResolver;
    private final WebhookEventVerifier eventVerifier;
    private final WebhookInboundExecutionService inboundExecutionService;

    @GetMapping("/{workflowId}")
    public ResponseEntity<String> handleGet(@PathVariable String workflowId, HttpServletRequest request) {
        WebhookInboundResolver.ResolvedWebhookInbound resolved = inboundResolver.resolve(workflowId);
        return eventVerifier.handleChallengeGet(request, resolved.getInbound());
    }

    @PostMapping("/{workflowId}")
    public ResponseEntity<Void> handlePost(
            @PathVariable String workflowId,
            @RequestBody(required = false) byte[] rawBody,
            HttpServletRequest request) {
        WebhookInboundResolver.ResolvedWebhookInbound resolved = inboundResolver.resolve(workflowId);

        try {
            eventVerifier.verifyPost(request, rawBody, resolved.getRegistration(), resolved.getInbound());
        } catch (WebhookInboundException ex) {
            inboundExecutionService.recordVerificationFailure(resolved.getRegistration(), ex.getMessage());
            throw ex;
        }

        inboundExecutionService.processInbound(resolved, rawBody);
        return ResponseEntity.ok().build();
    }
}
