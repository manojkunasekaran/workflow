package com.app.api.service.webhook;

import com.app.api.config.properties.WorkflowApiProperties;
import com.app.api.dto.WebhookStateResponse;
import com.app.api.exception.WebhookInboundException;
import com.app.common.constant.ExecutionType;
import com.app.common.constant.TriggerRegistrationStatus;
import com.app.common.constant.TriggerWebhookEventType;
import com.app.common.entity.TriggerRegistration;
import com.app.common.entity.TriggerWebhookLog;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.model.trigger.TriggerType;
import com.app.common.model.variable.VariableValue;
import com.app.persistence.repository.TriggerRegistrationRepository;
import com.app.persistence.repository.TriggerWebhookLogRepository;
import com.app.api.service.WorkflowExecutionService;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Orchestrates inbound webhook verification outcomes, dedup, execution, and audit logging.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookInboundExecutionService {

    private final WorkflowExecutionService executionService;
    private final WebhookEventDedupService dedupService;
    private final WebhookPayloadMapper payloadMapper;
    private final TriggerRegistrationRepository registrationRepository;
    private final TriggerWebhookLogRepository webhookLogRepository;
    private final WebhookUrlBuilder webhookUrlBuilder;
    private final WorkflowApiProperties apiProperties;

    public InboundProcessResult processInbound(
            WebhookInboundResolver.ResolvedWebhookInbound resolved,
            byte[] rawBody) {
        long start = System.currentTimeMillis();
        TriggerRegistration registration = resolved.getRegistration();
        WorkflowDefinition definition = resolved.getDefinition();

        Object parsedBody = payloadMapper.parseBody(rawBody);
        Optional<String> eventId = dedupService.extractEventId(parsedBody, resolved.getInbound());

        if (eventId.isPresent() && dedupService.isDuplicate(registration, eventId.get())) {
            log.info(
                    "Duplicate webhook event ignored: workflowId={}, eventId={}",
                    registration.getWorkflowDefinitionId(),
                    eventId.get());
            writeInboundLog(registration, definition.getId(), start, true, false, "Duplicate event ignored");
            recordInboundSuccess(registration);
            return InboundProcessResult.duplicate();
        }

        Map<String, VariableValue> inputs = payloadMapper.mapPayload(parsedBody, resolved.getInbound().getPayloadPath());

        executionService.triggerExecution(
                definition.getId(),
                inputs,
                ExecutionType.ASYNC,
                resolved.getTriggerType());

        if (eventId.isPresent()) {
            dedupService.recordEvent(registration, eventId.get());
        }

        writeInboundLog(registration, definition.getId(), start, true, true, null);
        recordInboundSuccess(registration);
        return InboundProcessResult.triggered();
    }

    public void recordVerificationFailure(TriggerRegistration registration, String error) {
        long start = System.currentTimeMillis();
        registration.setLastErrorAt(Instant.now());
        registration.setLastErrorMessage(error);
        int failures = registration.getConsecutiveFailures() + 1;
        registration.setConsecutiveFailures(failures);
        if (failures >= apiProperties.getWebhook().getMaxConsecutiveFailures()) {
            registration.setStatus(TriggerRegistrationStatus.ERROR);
        }
        registrationRepository.save(registration);
        writeInboundLog(
                registration,
                registration.getWorkflowDefinitionId(),
                start,
                false,
                false,
                error);
    }

    public WebhookStateResponse getWebhookState(String workflowDefinitionId) {
        TriggerRegistration registration = registrationRepository.findByWorkflowDefinitionId(workflowDefinitionId)
                .orElseThrow(() -> new ResourceNotFoundException("TriggerRegistration", workflowDefinitionId));

        if (registration.getTriggerType() != TriggerType.WEBHOOK) {
            throw new WebhookInboundException(
                    HttpStatus.BAD_REQUEST, "Workflow does not have a passive WEBHOOK trigger configured");
        }

        return WebhookStateResponse.builder()
                .registrationId(registration.getId())
                .webhookUrl(webhookUrlBuilder.buildCallbackUrl(registration.getWorkflowDefinitionId()))
                .status(registration.getStatus().name())
                .lastInboundAt(registration.getLastInboundAt())
                .consecutiveFailures(registration.getConsecutiveFailures())
                .build();
    }

    public Page<TriggerWebhookLog> getWebhookLogs(String workflowDefinitionId, Pageable pageable) {
        TriggerRegistration registration = registrationRepository.findByWorkflowDefinitionId(workflowDefinitionId)
                .orElseThrow(() -> new ResourceNotFoundException("TriggerRegistration", workflowDefinitionId));

        if (registration.getTriggerType() != TriggerType.WEBHOOK) {
            throw new WebhookInboundException(
                    HttpStatus.BAD_REQUEST, "Workflow does not have a passive WEBHOOK trigger configured");
        }

        return webhookLogRepository.findByWorkflowDefinitionIdAndEventTypeOrderByTimestampDesc(
                workflowDefinitionId, TriggerWebhookEventType.INBOUND, pageable);
    }

    private void recordInboundSuccess(TriggerRegistration registration) {
        registration.setLastInboundAt(Instant.now());
        registration.setConsecutiveFailures(0);
        registration.setLastErrorMessage(null);
        registration.setLastErrorAt(null);
        if (registration.getStatus() == TriggerRegistrationStatus.ERROR) {
            registration.setStatus(TriggerRegistrationStatus.ACTIVE);
        }
        registrationRepository.save(registration);
    }

    private void writeInboundLog(
            TriggerRegistration registration,
            String workflowDefinitionId,
            long startMs,
            boolean success,
            boolean triggeredExecution,
            String error) {
        TriggerWebhookLog logEntry = TriggerWebhookLog.builder()
                .id(UUID.randomUUID().toString())
                .registrationId(registration.getId())
                .workflowDefinitionId(workflowDefinitionId)
                .eventType(TriggerWebhookEventType.INBOUND)
                .timestamp(Instant.now())
                .durationMs(System.currentTimeMillis() - startMs)
                .success(success)
                .error(error)
                .triggeredExecution(triggeredExecution)
                .build();
        webhookLogRepository.save(logEntry);
    }

    @Getter
    public static class InboundProcessResult {
        private final boolean duplicate;
        private final boolean triggered;

        private InboundProcessResult(boolean duplicate, boolean triggered) {
            this.duplicate = duplicate;
            this.triggered = triggered;
        }

        public static InboundProcessResult duplicate() {
            return new InboundProcessResult(true, false);
        }

        public static InboundProcessResult triggered() {
            return new InboundProcessResult(false, true);
        }
    }
}
