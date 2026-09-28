package com.app.api.service.poll;

import com.app.api.config.properties.WorkflowApiProperties;
import com.app.api.dto.PollReprocessRequest;
import com.app.api.dto.PollReprocessResult;
import com.app.api.dto.PollTestResult;
import com.app.api.service.WorkflowExecutionService;
import com.app.common.entity.TriggerPollState;
import com.app.common.entity.TriggerRegistration;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.model.trigger.ChangeDetectionConfig;
import com.app.common.model.trigger.PollConfig;
import com.app.common.model.trigger.PollEpoch;
import com.app.common.model.trigger.PollEventSemantics;
import com.app.common.model.trigger.PollHttpConfig;
import com.app.common.model.trigger.PollScheduleConfig;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PollExecutionServiceTest {

    @Mock
    private WorkflowDefinitionRepository definitionRepository;
    @Mock
    private TriggerRegistrationService registrationService;
    @Mock
    private PollHttpExecutor httpExecutor;
    @Mock
    private WorkflowExecutionService executionService;
    @Mock
    private PollMetrics pollMetrics;

    private PollExecutionService pollExecutionService;

    @BeforeEach
    void setUp() {
        WorkflowApiProperties properties = new WorkflowApiProperties();
        pollExecutionService = new PollExecutionService(
                definitionRepository,
                registrationService,
                httpExecutor,
                new PollResponseParser(new com.fasterxml.jackson.databind.ObjectMapper()),
                new PollFilterEvaluator(),
                new ChangeDetectionEngine(
                        new NewItemsStrategy(),
                        new UpdatedItemsStrategy(),
                        new NewOrUpdatedStrategy(),
                        new ResponseChangedStrategy(new com.fasterxml.jackson.databind.ObjectMapper()),
                        new PollResponseParser(new com.fasterxml.jackson.databind.ObjectMapper())),
                executionService,
                properties,
                pollMetrics);
    }

    @Test
    void testPoll_returnsPreviewWithoutTriggeringExecution() {
        String workflowId = "wf-poll-1";
        WorkflowDefinition definition = buildDefinition(workflowId);
        TriggerRegistration registration = TriggerRegistration.builder()
                .id("reg-1")
                .workflowDefinitionId(workflowId)
                .build();
        TriggerPollState state = TriggerPollState.builder()
                .seenKeys(new ArrayList<>())
                .baselineEstablished(true)
                .build();

        when(definitionRepository.findById(workflowId)).thenReturn(Optional.of(definition));
        when(registrationService.findByWorkflowDefinitionId(workflowId)).thenReturn(Optional.of(registration));
        when(registrationService.loadOrCreateState(registration, definition.getTrigger().getPoll())).thenReturn(state);
        when(httpExecutor.execute(any(PollHttpConfig.class), any())).thenReturn(PollHttpResult.builder()
                .success(true)
                .statusCode(200)
                .durationMs(50)
                .rawBody("[{\"id\":\"1\"},{\"id\":\"2\"}]")
                .body(List.of(Map.of("id", "1"), Map.of("id", "2")))
                .build());
        PollTestResult result = pollExecutionService.testPoll(workflowId);

        assertTrue(result.isSuccess());
        assertEquals(2, result.getItemsFetched());
        assertEquals(2, result.getItemsNew());
        verify(executionService, never()).triggerExecution(anyString(), any(), any(), any());
        verify(registrationService, never()).saveState(any());
        verify(registrationService, never()).writePollLog(any(), anyLong(), anyInt(), anyInt(), anyInt(), anyInt(), anyBoolean(), any());
        verify(pollMetrics, never()).recordPoll(anyLong(), anyInt(), anyBoolean());
    }

    @Test
    void executePoll_triggersWorkflowForNewItems() {
        String workflowId = "wf-poll-2";
        WorkflowDefinition definition = buildDefinition(workflowId);
        definition.getTrigger().getPoll().setEpoch(PollEpoch.NOW);
        TriggerRegistration registration = TriggerRegistration.builder()
                .id("reg-2")
                .workflowDefinitionId(workflowId)
                .build();
        TriggerPollState state = TriggerPollState.builder()
                .seenKeys(new ArrayList<>())
                .baselineEstablished(true)
                .build();

        when(definitionRepository.findById(workflowId)).thenReturn(Optional.of(definition));
        when(registrationService.findByWorkflowDefinitionId(workflowId)).thenReturn(Optional.of(registration));
        when(registrationService.loadOrCreateState(registration, definition.getTrigger().getPoll())).thenReturn(state);
        when(httpExecutor.execute(any(PollHttpConfig.class), any())).thenReturn(PollHttpResult.builder()
                .success(true)
                .statusCode(200)
                .durationMs(30)
                .rawBody("[{\"id\":\"99\"}]")
                .body(List.of(Map.of("id", "99")))
                .build());
        when(registrationService.writePollLog(any(), anyLong(), anyInt(), anyInt(), anyInt(), anyInt(), anyBoolean(), any()))
                .thenReturn(null);

        pollExecutionService.executePoll(workflowId);

        verify(executionService).triggerExecution(eq(workflowId), any(), any(), eq(TriggerType.POLL));
        verify(registrationService).saveState(any());
        verify(registrationService).recordPollSuccess(registration);
        verify(registrationService).writePollLog(any(), anyLong(), anyInt(), anyInt(), anyInt(), anyInt(), anyBoolean(), any());
        verify(pollMetrics).recordPoll(anyLong(), anyInt(), eq(false));
    }

    @Test
    void executePoll_writesLogForCheckRunWithZeroNewItems() {
        String workflowId = "wf-poll-3";
        WorkflowDefinition definition = buildDefinition(workflowId);
        definition.getTrigger().getPoll().setEpoch(PollEpoch.NOW);
        TriggerRegistration registration = TriggerRegistration.builder()
                .id("reg-3")
                .workflowDefinitionId(workflowId)
                .build();
        TriggerPollState state = TriggerPollState.builder()
                .seenKeys(new ArrayList<>(List.of(
                        TriggerPollState.SeenKey.builder().key("1").build())))
                .baselineEstablished(true)
                .build();

        when(definitionRepository.findById(workflowId)).thenReturn(Optional.of(definition));
        when(registrationService.findByWorkflowDefinitionId(workflowId)).thenReturn(Optional.of(registration));
        when(registrationService.loadOrCreateState(registration, definition.getTrigger().getPoll())).thenReturn(state);
        when(httpExecutor.execute(any(PollHttpConfig.class), any())).thenReturn(PollHttpResult.builder()
                .success(true)
                .statusCode(200)
                .durationMs(40)
                .rawBody("[{\"id\":\"1\"}]")
                .body(List.of(Map.of("id", "1")))
                .build());
        when(registrationService.writePollLog(any(), anyLong(), anyInt(), anyInt(), anyInt(), anyInt(), anyBoolean(), any()))
                .thenReturn(null);

        pollExecutionService.executePoll(workflowId);

        verify(executionService, never()).triggerExecution(anyString(), any(), any(), any());
        verify(registrationService).writePollLog(
                eq(registration), eq(40L), eq(1), eq(0), eq(1), eq(0), eq(false), eq(null));
    }

    @Test
    void reprocessItems_triggersMatchedKeys() {
        String workflowId = "wf-poll-reprocess";
        WorkflowDefinition definition = buildDefinition(workflowId);
        TriggerRegistration registration = TriggerRegistration.builder()
                .id("reg-reprocess")
                .workflowDefinitionId(workflowId)
                .build();

        when(definitionRepository.findById(workflowId)).thenReturn(Optional.of(definition));
        when(registrationService.findByWorkflowDefinitionId(workflowId)).thenReturn(Optional.of(registration));
        when(httpExecutor.execute(any(PollHttpConfig.class))).thenReturn(PollHttpResult.builder()
                .success(true)
                .statusCode(200)
                .durationMs(25)
                .rawBody("[{\"id\":\"1\"},{\"id\":\"2\"}]")
                .body(List.of(Map.of("id", "1"), Map.of("id", "2")))
                .build());
        when(registrationService.writePollLog(any(), anyLong(), anyInt(), anyInt(), anyInt(), anyInt(), anyBoolean(), any(), anyBoolean(), any()))
                .thenReturn(null);

        PollReprocessResult result = pollExecutionService.reprocessItems(
                workflowId, PollReprocessRequest.builder().itemKeys(List.of("1", "missing")).build());

        assertTrue(result.isSuccess());
        assertEquals(1, result.getItemsMatched());
        assertEquals(1, result.getUnmatchedKeys().size());
        verify(executionService).triggerExecution(eq(workflowId), any(), any(), eq(TriggerType.POLL));
    }

    private WorkflowDefinition buildDefinition(String id) {
        WorkflowDefinition definition = new WorkflowDefinition();
        definition.setId(id);
        definition.setTrigger(TriggerConfig.builder()
                .type(TriggerType.POLL)
                .poll(PollConfig.builder()
                        .active(true)
                        .semantics(PollEventSemantics.NEW_ITEMS)
                        .epoch(PollEpoch.NOW)
                        .schedule(PollScheduleConfig.builder().intervalSeconds(300L).build())
                        .http(PollHttpConfig.builder()
                                .url("https://api.example.com/data")
                                .method("GET")
                                .build())
                        .detection(ChangeDetectionConfig.builder().build())
                        .build())
                .build());
        return definition;
    }
}
