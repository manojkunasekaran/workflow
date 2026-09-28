package com.app.api.controller;

import com.app.api.dto.WebhookSubscribeStateResponse;
import com.app.api.dto.WebhookSubscribeTestResult;
import com.app.api.service.webhook.WebhookSubscribeService;
import com.app.common.entity.TriggerWebhookLog;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.exception.ValidationException;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.common.model.trigger.WebhookConfig;
import com.app.common.model.trigger.WebhookDeliveryMode;
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
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebhookSubscribeControllerTest {

    @Mock
    private WorkflowDefinitionRepository definitionRepository;
    @Mock
    private WebhookSubscribeService subscribeService;

    @InjectMocks
    private WebhookSubscribeController controller;

    private WorkflowDefinition workflowDefinition;

    @BeforeEach
    void setUp() {
        workflowDefinition = new WorkflowDefinition();
        workflowDefinition.setId("wf-sub-1");
        workflowDefinition.setName("Subscribe Workflow");
        workflowDefinition.setTrigger(TriggerConfig.builder()
                .type(TriggerType.WEBHOOK)
                .webhook(WebhookConfig.builder()
                        .deliveryMode(WebhookDeliveryMode.SUBSCRIBE)
                        .active(true)
                        .build())
                .build());
    }

    @Test
    void testSubscribe_delegatesToService() {
        WebhookSubscribeTestResult expected = WebhookSubscribeTestResult.builder()
                .success(true)
                .durationMs(120L)
                .statusCode(200)
                .extractedSubscriptionId("vendor-1")
                .build();

        when(definitionRepository.findById("wf-sub-1")).thenReturn(Optional.of(workflowDefinition));
        when(subscribeService.testSubscribe("wf-sub-1")).thenReturn(expected);

        ResponseEntity<WebhookSubscribeTestResult> response = controller.testSubscribe("wf-sub-1");

        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody().isSuccess());
        verify(subscribeService).testSubscribe("wf-sub-1");
    }

    @Test
    void getSubscribeState_returnsRegistrationStatus() {
        WebhookSubscribeStateResponse state = WebhookSubscribeStateResponse.builder()
                .status("ACTIVE")
                .webhookUrl("https://api.example.com/rest/webhook-events/wf-sub-1")
                .hasExternalSubscription(true)
                .consecutiveFailures(0)
                .build();

        when(definitionRepository.findById("wf-sub-1")).thenReturn(Optional.of(workflowDefinition));
        when(subscribeService.getSubscribeState("wf-sub-1")).thenReturn(state);

        WebhookSubscribeStateResponse result = controller.getSubscribeState("wf-sub-1");

        assertEquals("ACTIVE", result.getStatus());
        assertTrue(result.isHasExternalSubscription());
    }

    @Test
    void getSubscribeLogs_returnsPaginatedHistory() {
        PageRequest pageable = PageRequest.of(0, 20);
        TriggerWebhookLog log = TriggerWebhookLog.builder()
                .id("log-1")
                .timestamp(Instant.now())
                .durationMs(80L)
                .success(true)
                .build();
        Page<TriggerWebhookLog> page = new PageImpl<>(List.of(log));

        when(definitionRepository.findById("wf-sub-1")).thenReturn(Optional.of(workflowDefinition));
        when(subscribeService.getSubscribeLogs("wf-sub-1", pageable)).thenReturn(page);

        Page<TriggerWebhookLog> result = controller.getSubscribeLogs("wf-sub-1", pageable);

        assertEquals(1, result.getContent().size());
        verify(subscribeService).getSubscribeLogs("wf-sub-1", pageable);
    }

    @Test
    void getSubscribeState_failsWhenTriggerNotSubscribe() {
        workflowDefinition.setTrigger(TriggerConfig.builder().type(TriggerType.WEBHOOK).build());
        when(definitionRepository.findById("wf-sub-1")).thenReturn(Optional.of(workflowDefinition));

        assertThrows(ValidationException.class, () -> controller.getSubscribeState("wf-sub-1"));
    }
}
