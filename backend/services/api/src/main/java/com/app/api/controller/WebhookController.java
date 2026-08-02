package com.app.api.controller;

import com.app.api.service.WorkflowExecutionService;
import com.app.common.constant.ExecutionType;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.entity.WorkflowExecution;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.exception.ValidationException;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.common.model.variable.VariableType;
import com.app.common.model.variable.VariableValue;
import com.app.persistence.repository.WorkflowDefinitionRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Public webhook receiver for workflow triggers.
 *
 * <p>External systems (Stripe, GitHub, Slack, etc.) POST JSON payloads to
 * {@code /webhooks/{workflowId}} to start a workflow execution.
 *
 * <p>This controller does NOT duplicate any trigger logic — it delegates
 * entirely to {@link WorkflowExecutionService#triggerExecution} with
 * {@link TriggerType#WEBHOOK} as the trigger source.
 */
@Slf4j
@RestController
@RequestMapping("/webhooks")
@RequiredArgsConstructor
public class WebhookController {

    private final WorkflowDefinitionRepository definitionRepository;
    private final WorkflowExecutionService executionService;

    /**
     * Receive an incoming webhook for a workflow.
     *
     * @param workflowId the workflow definition ID
     * @param payload    the raw JSON body — auto-converted to trigger inputs
     * @return 202 Accepted with the queued execution
     */
    @PostMapping("/{workflowId}")
    public ResponseEntity<WorkflowExecution> handleWebhook(
            @PathVariable String workflowId,
            @RequestBody(required = false) Map<String, Object> payload) {

        WorkflowDefinition definition = definitionRepository.findById(workflowId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowDefinition", workflowId));

        validateWebhookActive(definition);

        Map<String, VariableValue> inputs = convertPayloadToInputs(payload);

        WorkflowExecution execution = executionService.triggerExecution(
                workflowId, inputs, ExecutionType.ASYNC, TriggerType.WEBHOOK);

        log.info("Webhook triggered workflow: workflowId={}, executionId={}",
                workflowId, execution.getId());

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(execution);
    }

    /**
     * Verify that the workflow has an active webhook trigger configured.
     */
    private void validateWebhookActive(WorkflowDefinition definition) {
        TriggerConfig trigger = definition.getTrigger();
        if (trigger == null || trigger.getType() != TriggerType.WEBHOOK) {
            throw new ValidationException(
                    "Workflow '" + definition.getName() + "' does not have a WEBHOOK trigger configured.");
        }
        if (trigger.getWebhook() != null && !trigger.getWebhook().isActive()) {
            throw new ValidationException(
                    "Webhook trigger for workflow '" + definition.getName() + "' is currently disabled.");
        }
    }

    /**
     * Convert raw JSON map to typed VariableValue map.
     * Auto-detects value types (String, Number, Boolean, Object).
     */
    private Map<String, VariableValue> convertPayloadToInputs(Map<String, Object> payload) {
        if (payload == null || payload.isEmpty()) {
            return new HashMap<>();
        }

        Map<String, VariableValue> inputs = new HashMap<>();
        for (Map.Entry<String, Object> entry : payload.entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();

            VariableType type;
            if (value instanceof String) {
                type = VariableType.STRING;
            } else if (value instanceof Number) {
                type = VariableType.NUMBER;
            } else if (value instanceof Boolean) {
                type = VariableType.BOOLEAN;
            } else {
                type = VariableType.OBJECT;
            }

            inputs.put(key, VariableValue.builder()
                    .name(key)
                    .type(type)
                    .value(value)
                    .build());
        }
        return inputs;
    }
}
