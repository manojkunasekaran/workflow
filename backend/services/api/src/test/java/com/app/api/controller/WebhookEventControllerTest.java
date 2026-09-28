package com.app.api.controller;

import com.app.api.config.GlobalExceptionHandler;
import com.app.api.exception.WebhookInboundException;
import com.app.api.service.webhook.WebhookEventVerifier;
import com.app.api.service.webhook.WebhookInboundExecutionService;
import com.app.api.service.webhook.WebhookInboundResolver;
import com.app.common.constant.TriggerRegistrationStatus;
import com.app.common.entity.TriggerRegistration;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.common.model.trigger.WebhookConfig;
import com.app.common.model.trigger.WebhookInboundConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(WebhookEventController.class)
@ContextConfiguration(classes = {WebhookEventController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
class WebhookEventControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private WebhookInboundResolver inboundResolver;
    @MockBean
    private WebhookEventVerifier eventVerifier;
    @MockBean
    private WebhookInboundExecutionService inboundExecutionService;

    @Test
    void handlePost_returns200OnSuccess() throws Exception {
        WebhookInboundResolver.ResolvedWebhookInbound resolved = resolvedWebhook("def-1");
        when(inboundResolver.resolve("def-1")).thenReturn(resolved);
        when(inboundExecutionService.processInbound(resolved, "{\"id\":\"evt-1\"}".getBytes()))
                .thenReturn(WebhookInboundExecutionService.InboundProcessResult.triggered());

        mockMvc.perform(post("/webhook-events/def-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":\"evt-1\"}"))
                .andExpect(status().isOk());

        verify(eventVerifier).verifyPost(any(), any(), eq(resolved.getRegistration()), eq(resolved.getInbound()));
        verify(inboundExecutionService).processInbound(eq(resolved), any(byte[].class));
    }

    @Test
    void handlePost_returns401OnVerificationFailure() throws Exception {
        WebhookInboundResolver.ResolvedWebhookInbound resolved = resolvedWebhook("def-bad");
        when(inboundResolver.resolve("def-bad")).thenReturn(resolved);
        doThrow(new WebhookInboundException(HttpStatus.UNAUTHORIZED, "Webhook verification failed"))
                .when(eventVerifier)
                .verifyPost(any(), any(), eq(resolved.getRegistration()), eq(resolved.getInbound()));

        mockMvc.perform(post("/webhook-events/def-bad")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());

        verify(inboundExecutionService).recordVerificationFailure(
                eq(resolved.getRegistration()), eq("Webhook verification failed"));
    }

    @Test
    void legacyWebhookPath_returns404() throws Exception {
        mockMvc.perform(post("/webhooks/def-old")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isNotFound());
    }

    private WebhookInboundResolver.ResolvedWebhookInbound resolvedWebhook(String workflowId) {
        TriggerRegistration registration = TriggerRegistration.builder()
                .id("reg-1")
                .workflowDefinitionId(workflowId)
                .triggerType(TriggerType.WEBHOOK)
                .status(TriggerRegistrationStatus.ACTIVE)
                .build();
        WorkflowDefinition definition = WorkflowDefinition.builder()
                .id(workflowId)
                .trigger(TriggerConfig.builder()
                        .type(TriggerType.WEBHOOK)
                        .webhook(WebhookConfig.builder().active(true).build())
                        .build())
                .build();
        WebhookInboundConfig inbound = WebhookInboundConfig.builder().build();
        return WebhookInboundResolver.ResolvedWebhookInbound.builder()
                .registration(registration)
                .definition(definition)
                .triggerType(TriggerType.WEBHOOK)
                .inbound(inbound)
                .build();
    }
}
