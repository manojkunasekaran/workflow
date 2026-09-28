package com.app.api.controller;

import com.app.api.dto.WebhookSubscribeStateResponse;
import com.app.api.dto.WebhookSubscribeTestResult;
import com.app.api.service.webhook.WebhookSubscribeService;
import com.app.common.entity.TriggerWebhookLog;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.exception.ValidationException;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Managed webhook subscribe trigger test and state endpoints.
 */
@RestController
@RequestMapping("/workflows/{id}/trigger/subscribe")
@RequiredArgsConstructor
public class WebhookSubscribeController {

    private final WorkflowDefinitionRepository definitionRepository;
    private final WebhookSubscribeService subscribeService;

    @PostMapping("/test")
    public ResponseEntity<WebhookSubscribeTestResult> testSubscribe(@PathVariable("id") String workflowId) {
        WorkflowDefinition definition = definitionRepository.findById(workflowId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowDefinition", workflowId));
        validateSubscribeTrigger(definition);

        WebhookSubscribeTestResult result = subscribeService.testSubscribe(workflowId);
        return ResponseEntity.status(HttpStatus.OK).body(result);
    }

    @GetMapping("/state")
    public WebhookSubscribeStateResponse getSubscribeState(@PathVariable("id") String workflowId) {
        WorkflowDefinition definition = definitionRepository.findById(workflowId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowDefinition", workflowId));
        validateSubscribeTrigger(definition);

        return subscribeService.getSubscribeState(workflowId);
    }

    @GetMapping("/logs")
    public Page<TriggerWebhookLog> getSubscribeLogs(
            @PathVariable("id") String workflowId,
            @PageableDefault(size = 20, sort = "timestamp", direction = Sort.Direction.DESC) Pageable pageable) {
        WorkflowDefinition definition = definitionRepository.findById(workflowId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowDefinition", workflowId));
        validateSubscribeTrigger(definition);

        return subscribeService.getSubscribeLogs(workflowId, pageable);
    }

    private void validateSubscribeTrigger(WorkflowDefinition definition) {
        TriggerConfig trigger = definition.getTrigger();
        if (trigger == null
                || trigger.getType() != TriggerType.WEBHOOK
                || trigger.getWebhook() == null
                || !trigger.getWebhook().isSubscribeMode()) {
            throw new ValidationException(
                    "Workflow '" + definition.getName() + "' does not have a subscribe webhook trigger configured.");
        }
    }
}
