package com.app.api.service.webhook;

import com.app.api.config.properties.WorkflowApiProperties;
import com.app.api.service.WorkflowExecutionService;
import com.app.common.constant.ExecutionType;
import com.app.common.constant.TriggerRegistrationStatus;
import com.app.common.entity.TriggerRegistration;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.common.model.trigger.WebhookConfig;
import com.app.common.model.trigger.WebhookInboundConfig;
import com.app.persistence.repository.TriggerRegistrationRepository;
import com.app.persistence.repository.TriggerWebhookLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebhookInboundExecutionServiceTest {

    @Mock
    private WorkflowExecutionService executionService;
    @Mock
    private WebhookEventDedupService dedupService;
    @Mock
    private WebhookPayloadMapper payloadMapper;
    @Mock
    private TriggerRegistrationRepository registrationRepository;
    @Mock
    private TriggerWebhookLogRepository webhookLogRepository;
    @Mock
    private WebhookUrlBuilder webhookUrlBuilder;

    private WorkflowApiProperties apiProperties;
    private WebhookInboundExecutionService inboundExecutionService;

    @BeforeEach
    void setUp() {
        apiProperties = new WorkflowApiProperties();
        inboundExecutionService = new WebhookInboundExecutionService(
                executionService,
                dedupService,
                payloadMapper,
                registrationRepository,
                webhookLogRepository,
                webhookUrlBuilder,
                apiProperties);
    }

    @Test
    void processInbound_triggersLatestDefinition() {
        TriggerRegistration registration = TriggerRegistration.builder()
                .id("reg-1")
                .workflowDefinitionId("def-latest")
                .status(TriggerRegistrationStatus.ACTIVE)
                .build();
        WorkflowDefinition definition = WorkflowDefinition.builder()
                .id("def-latest")
                .trigger(TriggerConfig.builder()
                        .type(TriggerType.WEBHOOK)
                        .webhook(WebhookConfig.builder().active(true).build())
                        .build())
                .build();
        WebhookInboundConfig inbound = WebhookInboundConfig.builder().ignoreDuplicates(false).build();
        WebhookInboundResolver.ResolvedWebhookInbound resolved = WebhookInboundResolver.ResolvedWebhookInbound.builder()
                .registration(registration)
                .definition(definition)
                .triggerType(TriggerType.WEBHOOK)
                .inbound(inbound)
                .build();

        byte[] body = "{\"message\":\"hello\"}".getBytes(StandardCharsets.UTF_8);
        Map<String, Object> parsed = Map.of("message", "hello");

        when(payloadMapper.parseBody(body)).thenReturn(parsed);
        when(dedupService.extractEventId(parsed, inbound)).thenReturn(Optional.empty());
        when(payloadMapper.mapPayload(parsed, null)).thenReturn(Map.of());
        when(registrationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        inboundExecutionService.processInbound(resolved, body);

        verify(executionService).triggerExecution(
                eq("def-latest"), any(), eq(ExecutionType.ASYNC), eq(TriggerType.WEBHOOK));
        verify(webhookLogRepository).save(any());
    }

    @Test
    void processInbound_skipsExecutionForDuplicate() {
        TriggerRegistration registration = TriggerRegistration.builder()
                .id("reg-1")
                .workflowDefinitionId("def-latest")
                .status(TriggerRegistrationStatus.ACTIVE)
                .build();
        WorkflowDefinition definition = WorkflowDefinition.builder()
                .id("def-latest")
                .build();
        WebhookInboundConfig inbound = WebhookInboundConfig.builder()
                .ignoreDuplicates(true)
                .eventIdPath("$.id")
                .build();
        WebhookInboundResolver.ResolvedWebhookInbound resolved = WebhookInboundResolver.ResolvedWebhookInbound.builder()
                .registration(registration)
                .definition(definition)
                .triggerType(TriggerType.WEBHOOK)
                .inbound(inbound)
                .build();

        byte[] body = "{\"id\":\"evt-dup\"}".getBytes(StandardCharsets.UTF_8);
        Map<String, Object> parsed = Map.of("id", "evt-dup");

        when(payloadMapper.parseBody(body)).thenReturn(parsed);
        when(dedupService.extractEventId(parsed, inbound)).thenReturn(Optional.of("evt-dup"));
        when(dedupService.isDuplicate(registration, "evt-dup")).thenReturn(true);
        when(registrationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        inboundExecutionService.processInbound(resolved, body);

        verify(executionService, never()).triggerExecution(any(), any(), any(), any());
        verify(webhookLogRepository).save(any());
    }
}
