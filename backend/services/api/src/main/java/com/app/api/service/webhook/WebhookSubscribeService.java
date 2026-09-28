package com.app.api.service.webhook;

import com.app.api.config.properties.WorkflowApiProperties;
import com.app.api.dto.WebhookSubscribeStateResponse;
import com.app.api.dto.WebhookSubscribeTestResult;
import com.app.api.service.poll.PollHttpExecutor;
import com.app.api.service.poll.PollHttpResult;
import com.app.common.constant.TriggerRegistrationStatus;
import com.app.common.constant.TriggerWebhookEventType;
import com.app.common.entity.TriggerRegistration;
import com.app.common.entity.TriggerWebhookLog;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.model.trigger.PollHttpConfig;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.common.model.trigger.WebhookInboundConfig;
import com.app.common.model.trigger.WebhookConfig;
import com.app.common.util.DataTransformUtils;
import com.app.crypto.util.EncryptionService;
import com.app.persistence.repository.TriggerRegistrationRepository;
import com.app.persistence.repository.TriggerWebhookLogRepository;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Outbound subscribe/unsubscribe lifecycle for managed webhook triggers.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookSubscribeService implements WebhookSubscribeLifecycle {

    private final WorkflowDefinitionRepository definitionRepository;
    private final TriggerRegistrationRepository registrationRepository;
    private final TriggerWebhookLogRepository webhookLogRepository;
    private final PollHttpExecutor httpExecutor;
    private final WebhookUrlBuilder webhookUrlBuilder;
    private final EncryptionService encryptionService;
    private final WorkflowApiProperties apiProperties;
    private final ObjectMapper objectMapper;

    @Override
    public void onSync(WorkflowDefinition definition, TriggerRegistration registration) {
        WebhookConfig webhook = definition.getTrigger().getWebhook();
        if (webhook == null || !webhook.isActive() || !webhook.isSubscribeMode()) {
            return;
        }

        String fingerprint = computeFingerprint(webhook);
        if (fingerprint.equals(registration.getConfigFingerprint())
                && registration.getExternalSubscriptionId() != null
                && !registration.getExternalSubscriptionId().isBlank()) {
            log.debug(
                    "Skipping vendor subscribe for registration {} — fingerprint unchanged",
                    registration.getId());
            return;
        }

        if (registration.getExternalSubscriptionId() != null
                && !registration.getExternalSubscriptionId().isBlank()
                && !fingerprint.equals(registration.getConfigFingerprint())) {
            unsubscribeVendor(definition, registration, webhook);
        }

        executeSubscribe(definition, registration, webhook, fingerprint);
    }

    @Override
    public void onDeactivate(TriggerRegistration registration) {
        WorkflowDefinition definition = definitionRepository
                .findById(registration.getWorkflowDefinitionId())
                .orElse(null);
        if (definition == null || definition.getTrigger() == null
                || definition.getTrigger().getWebhook() == null
                || !definition.getTrigger().getWebhook().isSubscribeMode()) {
            clearSubscriptionState(registration);
            registrationRepository.save(registration);
            return;
        }

        WebhookConfig webhook = definition.getTrigger().getWebhook();
        if (registration.getExternalSubscriptionId() != null
                && !registration.getExternalSubscriptionId().isBlank()) {
            PollHttpConfig rendered = renderUnsubscribeHttp(
                    registration, webhook, registration.getExternalSubscriptionId());
            PollHttpResult result = httpExecutor.execute(rendered);
            boolean success = result.isSuccess();
            writeLifecycleLog(
                    registration,
                    registration.getWorkflowDefinitionId(),
                    TriggerWebhookEventType.UNSUBSCRIBE,
                    result.getDurationMs(),
                    success,
                    success ? null : resolveError(result));
            registration.setLastUnsubscribeAt(Instant.now());
            if (!success) {
                log.warn(
                        "Vendor unsubscribe failed for registration {} — disabling locally anyway",
                        registration.getId());
            }
        }

        clearSubscriptionState(registration);
        registrationRepository.save(registration);
    }

    public WebhookSubscribeTestResult testSubscribe(String workflowDefinitionId) {
        WorkflowDefinition definition = definitionRepository.findById(workflowDefinitionId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowDefinition", workflowDefinitionId));
        TriggerRegistration registration = registrationRepository.findByWorkflowDefinitionId(workflowDefinitionId)
                .orElseThrow(() -> new ResourceNotFoundException("TriggerRegistration", workflowDefinitionId));

        WebhookConfig webhook = definition.getTrigger().getWebhook();
        Map<String, String> templateValues = buildTemplateValues(registration, webhook, null);
        PollHttpConfig rendered = SubscribeTemplateRenderer.render(webhook.getSubscribeHttp(), templateValues);
        PollHttpResult result = httpExecutor.execute(rendered);

        String extractedId = null;
        String error = null;
        if (result.isSuccess()) {
            extractedId = extractSubscriptionId(result.getBody(), webhook.getSubscriptionIdPath());
            if (extractedId == null || extractedId.isBlank()) {
                error = "Subscribe HTTP succeeded but subscription id could not be extracted";
            }
        } else {
            error = resolveError(result);
        }

        boolean success = result.isSuccess() && error == null;
        return WebhookSubscribeTestResult.builder()
                .success(success)
                .durationMs(result.getDurationMs())
                .statusCode(result.getStatusCode() > 0 ? result.getStatusCode() : null)
                .extractedSubscriptionId(extractedId)
                .error(error)
                .build();
    }

    public WebhookSubscribeStateResponse getSubscribeState(String workflowDefinitionId) {
        TriggerRegistration registration = registrationRepository.findByWorkflowDefinitionId(workflowDefinitionId)
                .orElseThrow(() -> new ResourceNotFoundException("TriggerRegistration", workflowDefinitionId));

        WorkflowDefinition definition = definitionRepository.findById(workflowDefinitionId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowDefinition", workflowDefinitionId));
        if (registration.getTriggerType() != TriggerType.WEBHOOK
                || definition.getTrigger() == null
                || definition.getTrigger().getWebhook() == null
                || !definition.getTrigger().getWebhook().isSubscribeMode()) {
            throw new ResourceNotFoundException("TriggerRegistration", workflowDefinitionId);
        }

        return WebhookSubscribeStateResponse.builder()
                .registrationId(registration.getId())
                .webhookUrl(webhookUrlBuilder.buildCallbackUrl(registration.getWorkflowDefinitionId()))
                .status(registration.getStatus().name())
                .hasExternalSubscription(
                        registration.getExternalSubscriptionId() != null
                                && !registration.getExternalSubscriptionId().isBlank())
                .lastSubscribeAt(registration.getLastSubscribeAt())
                .lastUnsubscribeAt(registration.getLastUnsubscribeAt())
                .lastInboundAt(registration.getLastInboundAt())
                .lastErrorMessage(registration.getLastErrorMessage())
                .consecutiveFailures(registration.getConsecutiveFailures())
                .build();
    }

    public Page<TriggerWebhookLog> getSubscribeLogs(String workflowDefinitionId, Pageable pageable) {
        if (registrationRepository.findByWorkflowDefinitionId(workflowDefinitionId).isEmpty()) {
            throw new ResourceNotFoundException("TriggerRegistration", workflowDefinitionId);
        }
        return webhookLogRepository.findByWorkflowDefinitionIdOrderByTimestampDesc(workflowDefinitionId, pageable);
    }

    private void executeSubscribe(
            WorkflowDefinition definition,
            TriggerRegistration registration,
            WebhookConfig subscribe,
            String fingerprint) {
        Map<String, String> templateValues = buildTemplateValues(registration, subscribe, null);
        PollHttpConfig rendered = SubscribeTemplateRenderer.render(subscribe.getSubscribeHttp(), templateValues);
        PollHttpResult result = httpExecutor.execute(rendered);

        if (!result.isSuccess()) {
            recordSubscribeFailure(registration, resolveError(result));
            writeLifecycleLog(
                    registration,
                    definition.getId(),
                    TriggerWebhookEventType.SUBSCRIBE,
                    result.getDurationMs(),
                    false,
                    resolveError(result));
            return;
        }

        String subscriptionId = extractSubscriptionId(result.getBody(), subscribe.getSubscriptionIdPath());
        if (subscriptionId == null || subscriptionId.isBlank()) {
            String error = "Subscribe HTTP succeeded but subscription id could not be extracted";
            recordSubscribeFailure(registration, error);
            writeLifecycleLog(
                    registration,
                    definition.getId(),
                    TriggerWebhookEventType.SUBSCRIBE,
                    result.getDurationMs(),
                    false,
                    error);
            return;
        }

        registration.setExternalSubscriptionId(subscriptionId);
        registration.setConfigFingerprint(fingerprint);
        registration.setLastSubscribeAt(Instant.now());
        recordSubscribeSuccess(registration);
        registrationRepository.save(registration);

        writeLifecycleLog(
                registration,
                definition.getId(),
                TriggerWebhookEventType.SUBSCRIBE,
                result.getDurationMs(),
                true,
                null);
    }

    private void unsubscribeVendor(
            WorkflowDefinition definition,
            TriggerRegistration registration,
            WebhookConfig subscribe) {
        String subscriptionId = registration.getExternalSubscriptionId();
        PollHttpConfig rendered = renderUnsubscribeHttp(registration, subscribe, subscriptionId);
        PollHttpResult result = httpExecutor.execute(rendered);
        boolean success = result.isSuccess();
        writeLifecycleLog(
                registration,
                definition.getId(),
                TriggerWebhookEventType.UNSUBSCRIBE,
                result.getDurationMs(),
                success,
                success ? null : resolveError(result));
        registration.setLastUnsubscribeAt(Instant.now());
        clearSubscriptionState(registration);
        registrationRepository.save(registration);
    }

    private PollHttpConfig renderUnsubscribeHttp(
            TriggerRegistration registration,
            WebhookConfig subscribe,
            String subscriptionId) {
        Map<String, String> templateValues = buildTemplateValues(registration, subscribe, subscriptionId);
        return SubscribeTemplateRenderer.render(subscribe.getUnsubscribeHttp(), templateValues);
    }

    private Map<String, String> buildTemplateValues(
            TriggerRegistration registration,
            WebhookConfig subscribe,
            String subscriptionId) {
        Map<String, String> values = new LinkedHashMap<>();
        values.put(SubscribeTemplateRenderer.CALLBACK_URL,
                webhookUrlBuilder.buildCallbackUrl(registration.getWorkflowDefinitionId()));
        values.put(SubscribeTemplateRenderer.SECRET, resolveSecret(registration, subscribe.getInbound()));
        if (subscriptionId != null) {
            values.put(SubscribeTemplateRenderer.SUBSCRIPTION_ID, subscriptionId);
        }
        return values;
    }

    private String resolveSecret(TriggerRegistration registration, WebhookInboundConfig inbound) {
        if (inbound != null && inbound.getSecret() != null && !inbound.getSecret().isBlank()) {
            return inbound.getSecret();
        }
        if (registration.getSigningSecret() == null || registration.getSigningSecret().isBlank()) {
            return "";
        }
        return encryptionService.decrypt(registration.getSigningSecret());
    }

    private String computeFingerprint(WebhookConfig subscribe) {
        Map<String, Object> canonical = new LinkedHashMap<>();
        canonical.put("subscribeHttp", subscribe.getSubscribeHttp());
        canonical.put("unsubscribeHttp", subscribe.getUnsubscribeHttp());
        canonical.put("subscriptionIdPath", subscribe.getSubscriptionIdPath());
        canonical.put("inbound", subscribe.getInbound());
        String json = DataTransformUtils.canonicalJson(canonical, objectMapper);
        return DataTransformUtils.sha256Hex(json);
    }

    private String extractSubscriptionId(Object body, String subscriptionIdPath) {
        if (subscriptionIdPath == null || subscriptionIdPath.isBlank()) {
            return null;
        }
        Object extracted = DataTransformUtils.extractJsonPath(body, subscriptionIdPath);
        return extracted != null ? String.valueOf(extracted) : null;
    }

    private void recordSubscribeSuccess(TriggerRegistration registration) {
        registration.setConsecutiveFailures(0);
        registration.setLastErrorMessage(null);
        registration.setLastErrorAt(null);
        if (registration.getStatus() == TriggerRegistrationStatus.ERROR) {
            registration.setStatus(TriggerRegistrationStatus.ACTIVE);
        }
    }

    private void recordSubscribeFailure(TriggerRegistration registration, String error) {
        registration.setLastErrorAt(Instant.now());
        registration.setLastErrorMessage(error);
        int failures = registration.getConsecutiveFailures() + 1;
        registration.setConsecutiveFailures(failures);
        if (failures >= apiProperties.getWebhook().getMaxConsecutiveFailures()) {
            registration.setStatus(TriggerRegistrationStatus.ERROR);
        }
        registrationRepository.save(registration);
    }

    private void clearSubscriptionState(TriggerRegistration registration) {
        registration.setExternalSubscriptionId(null);
        registration.setConfigFingerprint(null);
    }

    private void writeLifecycleLog(
            TriggerRegistration registration,
            String workflowDefinitionId,
            TriggerWebhookEventType eventType,
            long durationMs,
            boolean success,
            String error) {
        TriggerWebhookLog logEntry = TriggerWebhookLog.builder()
                .id(UUID.randomUUID().toString())
                .registrationId(registration.getId())
                .workflowDefinitionId(workflowDefinitionId)
                .eventType(eventType)
                .timestamp(Instant.now())
                .durationMs(durationMs)
                .success(success)
                .error(error)
                .triggeredExecution(false)
                .build();
        webhookLogRepository.save(logEntry);
    }

    private String resolveError(PollHttpResult result) {
        if (result.getError() != null && !result.getError().isBlank()) {
            return result.getError();
        }
        if (result.getStatusCode() > 0) {
            return "HTTP " + result.getStatusCode();
        }
        return "Subscribe HTTP request failed";
    }
}
