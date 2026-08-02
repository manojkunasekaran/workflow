package com.app.api.controller;

import com.app.api.service.WorkflowExecutionService;
import com.app.common.constant.ExecutionType;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.entity.WorkflowExecution;
import com.app.common.exception.ValidationException;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.common.model.trigger.WebhookConfig;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WebhookControllerTest {

    @Mock
    private WorkflowDefinitionRepository definitionRepository;

    @Mock
    private WorkflowExecutionService executionService;

    @InjectMocks
    private WebhookController webhookController;

    private WorkflowDefinition workflowDefinition;
    private WorkflowExecution workflowExecution;

    @BeforeEach
    void setUp() {
        workflowDefinition = new WorkflowDefinition();
        workflowDefinition.setId("wf-123");
        workflowDefinition.setName("Test Webhook Workflow");
        
        workflowExecution = new WorkflowExecution();
        workflowExecution.setId("exec-123");
    }

    @Test
    void testHandleWebhook_Success() {
        // Arrange
        TriggerConfig trigger = new TriggerConfig();
        trigger.setType(TriggerType.WEBHOOK);
        trigger.setWebhook(WebhookConfig.builder().active(true).build());
        workflowDefinition.setTrigger(trigger);

        when(definitionRepository.findById("wf-123")).thenReturn(Optional.of(workflowDefinition));
        when(executionService.triggerExecution(eq("wf-123"), any(), eq(ExecutionType.ASYNC), eq(TriggerType.WEBHOOK)))
                .thenReturn(workflowExecution);

        Map<String, Object> payload = new HashMap<>();
        payload.put("message", "hello");

        // Act
        ResponseEntity<WorkflowExecution> response = webhookController.handleWebhook("wf-123", payload);

        // Assert
        assertEquals(HttpStatus.ACCEPTED, response.getStatusCode());
        assertEquals(workflowExecution, response.getBody());
        verify(executionService).triggerExecution(eq("wf-123"), any(), eq(ExecutionType.ASYNC), eq(TriggerType.WEBHOOK));
    }

    @Test
    void testHandleWebhook_FailsWhenTriggerNotWebhook() {
        // Arrange
        TriggerConfig trigger = new TriggerConfig();
        trigger.setType(TriggerType.MANUAL);
        workflowDefinition.setTrigger(trigger);

        when(definitionRepository.findById("wf-123")).thenReturn(Optional.of(workflowDefinition));

        // Act & Assert
        assertThrows(ValidationException.class, () -> {
            webhookController.handleWebhook("wf-123", new HashMap<>());
        });
        verify(executionService, never()).triggerExecution(any(), any(), any(), any());
    }

    @Test
    void testHandleWebhook_FailsWhenWebhookDisabled() {
        // Arrange
        TriggerConfig trigger = new TriggerConfig();
        trigger.setType(TriggerType.WEBHOOK);
        trigger.setWebhook(WebhookConfig.builder().active(false).build());
        workflowDefinition.setTrigger(trigger);

        when(definitionRepository.findById("wf-123")).thenReturn(Optional.of(workflowDefinition));

        // Act & Assert
        assertThrows(ValidationException.class, () -> {
            webhookController.handleWebhook("wf-123", new HashMap<>());
        });
        verify(executionService, never()).triggerExecution(any(), any(), any(), any());
    }
}
