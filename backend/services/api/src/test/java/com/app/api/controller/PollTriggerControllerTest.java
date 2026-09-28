package com.app.api.controller;

import com.app.api.dto.PollReprocessRequest;
import com.app.api.dto.PollReprocessResult;
import com.app.api.dto.PollStateResponse;
import com.app.api.service.poll.PollExecutionService;
import com.app.common.entity.TriggerPollLog;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.exception.ValidationException;
import com.app.common.model.trigger.PollConfig;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
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

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PollTriggerControllerTest {

    @Mock
    private WorkflowDefinitionRepository definitionRepository;
    @Mock
    private PollExecutionService pollExecutionService;

    @InjectMocks
    private PollTriggerController pollTriggerController;

    private WorkflowDefinition workflowDefinition;

    @BeforeEach
    void setUp() {
        workflowDefinition = new WorkflowDefinition();
        workflowDefinition.setId("wf-poll-1");
        workflowDefinition.setName("Poll Workflow");
        workflowDefinition.setTrigger(TriggerConfig.builder()
                .type(TriggerType.POLL)
                .poll(PollConfig.builder().active(true).build())
                .build());
    }

    @Test
    void getPollLogs_returnsPaginatedHistory() {
        PageRequest pageable = PageRequest.of(0, 20);
        TriggerPollLog log = TriggerPollLog.builder()
                .id("log-1")
                .polledAt(Instant.now())
                .durationMs(120L)
                .itemsFetched(10)
                .itemsNew(2)
                .itemsSkipped(8)
                .build();
        Page<TriggerPollLog> page = new PageImpl<>(List.of(log));

        when(definitionRepository.findById("wf-poll-1")).thenReturn(Optional.of(workflowDefinition));
        when(pollExecutionService.getPollLogs("wf-poll-1", pageable)).thenReturn(page);

        Page<TriggerPollLog> result = pollTriggerController.getPollLogs("wf-poll-1", pageable);

        assertEquals(1, result.getContent().size());
        assertEquals(2, result.getContent().get(0).getItemsNew());
        verify(pollExecutionService).getPollLogs("wf-poll-1", pageable);
    }

    @Test
    void getPollLogs_failsWhenTriggerNotPoll() {
        workflowDefinition.setTrigger(TriggerConfig.builder().type(TriggerType.MANUAL).build());
        when(definitionRepository.findById("wf-poll-1")).thenReturn(Optional.of(workflowDefinition));

        assertThrows(ValidationException.class,
                () -> pollTriggerController.getPollLogs("wf-poll-1", PageRequest.of(0, 20)));
    }

    @Test
    void reprocessPoll_delegatesToService() {
        PollReprocessRequest request = PollReprocessRequest.builder()
                .itemKeys(List.of("item-1"))
                .build();
        PollReprocessResult expected = PollReprocessResult.builder()
                .success(true)
                .itemsMatched(1)
                .itemsTriggered(1)
                .build();

        when(definitionRepository.findById("wf-poll-1")).thenReturn(Optional.of(workflowDefinition));
        when(pollExecutionService.reprocessItems("wf-poll-1", request)).thenReturn(expected);

        PollReprocessResult result = pollTriggerController.reprocessPoll("wf-poll-1", request);

        assertEquals(1, result.getItemsTriggered());
        verify(pollExecutionService).reprocessItems("wf-poll-1", request);
    }

    @Test
    void getPollState_returnsRegistrationStatus() {
        PollStateResponse state = PollStateResponse.builder()
                .status("ERROR")
                .consecutiveFailures(5)
                .build();

        when(definitionRepository.findById("wf-poll-1")).thenReturn(Optional.of(workflowDefinition));
        when(pollExecutionService.getPollState("wf-poll-1")).thenReturn(state);

        PollStateResponse result = pollTriggerController.getPollState("wf-poll-1");

        assertEquals("ERROR", result.getStatus());
        assertEquals(5, result.getConsecutiveFailures());
    }
}
