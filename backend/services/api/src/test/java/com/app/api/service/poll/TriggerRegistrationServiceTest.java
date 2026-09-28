package com.app.api.service.poll;

import com.app.api.config.properties.WorkflowApiProperties;
import com.app.common.constant.TriggerRegistrationStatus;
import com.app.common.entity.TriggerPollLog;
import com.app.common.entity.TriggerRegistration;
import com.app.common.exception.ResourceNotFoundException;
import com.app.persistence.repository.TriggerPollLogRepository;
import com.app.persistence.repository.TriggerPollStateRepository;
import com.app.persistence.repository.TriggerRegistrationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TriggerRegistrationServiceTest {

    @Mock
    private TriggerRegistrationRepository registrationRepository;
    @Mock
    private TriggerPollStateRepository pollStateRepository;
    @Mock
    private TriggerPollLogRepository pollLogRepository;

    private TriggerRegistrationService registrationService;

    @BeforeEach
    void setUp() {
        WorkflowApiProperties properties = new WorkflowApiProperties();
        properties.getPoll().setMaxConsecutiveFailures(3);
        registrationService = new TriggerRegistrationService(
                registrationRepository,
                pollStateRepository,
                pollLogRepository,
                properties);
    }

    @Test
    void recordPollFailure_setsErrorStatusAfterThreshold() {
        TriggerRegistration registration = TriggerRegistration.builder()
                .id("reg-1")
                .workflowDefinitionId("wf-1")
                .status(TriggerRegistrationStatus.ACTIVE)
                .consecutiveFailures(2)
                .build();

        registrationService.recordPollFailure(registration, "HTTP 500");

        assertEquals(TriggerRegistrationStatus.ERROR, registration.getStatus());
        assertEquals(3, registration.getConsecutiveFailures());
        verify(registrationRepository).save(registration);
    }

    @Test
    void recordPollSuccess_clearsErrorStatus() {
        TriggerRegistration registration = TriggerRegistration.builder()
                .id("reg-2")
                .workflowDefinitionId("wf-2")
                .status(TriggerRegistrationStatus.ERROR)
                .consecutiveFailures(3)
                .lastErrorMessage("timeout")
                .build();

        registrationService.recordPollSuccess(registration);

        assertEquals(TriggerRegistrationStatus.ACTIVE, registration.getStatus());
        assertEquals(0, registration.getConsecutiveFailures());
        verify(registrationRepository).save(registration);
    }

    @Test
    void getPollLogs_returnsPaginatedHistory() {
        String workflowId = "wf-3";
        Pageable pageable = PageRequest.of(0, 10);
        TriggerPollLog log = TriggerPollLog.builder()
                .id("log-1")
                .workflowDefinitionId(workflowId)
                .itemsFetched(5)
                .itemsNew(1)
                .build();
        Page<TriggerPollLog> page = new PageImpl<>(List.of(log));

        when(registrationRepository.findByWorkflowDefinitionId(workflowId))
                .thenReturn(Optional.of(TriggerRegistration.builder().id("reg-3").build()));
        when(pollLogRepository.findByWorkflowDefinitionIdOrderByPolledAtDesc(workflowId, pageable))
                .thenReturn(page);

        Page<TriggerPollLog> result = registrationService.getPollLogs(workflowId, pageable);

        assertEquals(1, result.getContent().size());
        assertEquals("log-1", result.getContent().get(0).getId());
    }

    @Test
    void getPollLogs_throwsWhenRegistrationMissing() {
        when(registrationRepository.findByWorkflowDefinitionId("missing")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> registrationService.getPollLogs("missing", PageRequest.of(0, 10)));
    }
}
