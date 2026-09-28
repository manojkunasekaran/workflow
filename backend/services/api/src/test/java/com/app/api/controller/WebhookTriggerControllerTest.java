package com.app.api.controller;

import com.app.api.dto.WebhookStateResponse;
import com.app.api.service.webhook.WebhookInboundExecutionService;
import com.app.common.entity.TriggerWebhookLog;
import com.app.common.entity.WorkflowDefinition;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebhookTriggerControllerTest {

    @Mock
    private WorkflowDefinitionRepository definitionRepository;
    @Mock
    private WebhookInboundExecutionService inboundExecutionService;

    @InjectMocks
    private WebhookTriggerController controller;

    private WorkflowDefinition workflowDefinition;

    @BeforeEach
    void setUp() {
        workflowDefinition = new WorkflowDefinition();
        workflowDefinition.setId("wf-webhook-1");
        workflowDefinition.setName("Webhook WF");
        workflowDefinition.setTrigger(TriggerConfig.builder()
                .type(TriggerType.WEBHOOK)
                .webhook(WebhookConfig.builder().active(true).build())
                .build());
    }

    @Test
    void getWebhookState_returnsState() {
        when(definitionRepository.findById("wf-webhook-1")).thenReturn(Optional.of(workflowDefinition));
        WebhookStateResponse state = WebhookStateResponse.builder()
                .webhookUrl("https://api.example.com/webhook-events/wf-webhook-1")
                .status("ACTIVE")
                .build();
        when(inboundExecutionService.getWebhookState("wf-webhook-1")).thenReturn(state);

        WebhookStateResponse result = controller.getWebhookState("wf-webhook-1");

        assertEquals("ACTIVE", result.getStatus());
        verify(inboundExecutionService).getWebhookState("wf-webhook-1");
    }

    @Test
    void getWebhookLogs_returnsPaginatedInboundHistory() {
        when(definitionRepository.findById("wf-webhook-1")).thenReturn(Optional.of(workflowDefinition));
        PageRequest pageable = PageRequest.of(0, 20);
        Page<TriggerWebhookLog> page = new PageImpl<>(List.of(TriggerWebhookLog.builder().id("log-1").build()));
        when(inboundExecutionService.getWebhookLogs("wf-webhook-1", pageable)).thenReturn(page);

        Page<TriggerWebhookLog> result = controller.getWebhookLogs("wf-webhook-1", pageable);

        assertEquals(1, result.getContent().size());
        verify(inboundExecutionService).getWebhookLogs("wf-webhook-1", pageable);
    }

    @Test
    void getWebhookState_rejectsNonWebhookTrigger() {
        workflowDefinition.setTrigger(TriggerConfig.builder().type(TriggerType.MANUAL).build());
        when(definitionRepository.findById("wf-webhook-1")).thenReturn(Optional.of(workflowDefinition));

        assertThrows(ValidationException.class, () -> controller.getWebhookState("wf-webhook-1"));
    }
}
