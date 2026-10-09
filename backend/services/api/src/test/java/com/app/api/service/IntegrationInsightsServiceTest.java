package com.app.api.service;

import com.app.api.dto.IntegrationInsightsResponse;
import com.app.api.dto.UseCaseInsightsItem;
import com.app.api.dto.UseCaseInsightsResponse;
import com.app.common.constant.WorkflowExecutionStatus;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.entity.WorkflowExecution;
import com.app.common.exception.ResourceNotFoundException;
import com.app.persistence.entity.IntegrationEntity;
import com.app.persistence.repository.IntegrationRepository;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import com.app.persistence.repository.WorkflowExecutionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IntegrationInsightsServiceTest {

    @Mock
    private IntegrationRepository integrationRepository;

    @Mock
    private WorkflowDefinitionRepository workflowDefinitionRepository;

    @Mock
    private WorkflowExecutionRepository workflowExecutionRepository;

    @InjectMocks
    private IntegrationInsightsService service;

    @Test
    void getInsights_unknownIntegration_throwsNotFound() {
        when(integrationRepository.findById("missing")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.getInsights("missing"));
    }

    @Test
    void getInsights_noUseCases_returnsEmptyMetrics() {
        when(integrationRepository.findById("int-1")).thenReturn(Optional.of(new IntegrationEntity()));
        when(workflowDefinitionRepository.findByIntegrationId("int-1")).thenReturn(List.of());

        IntegrationInsightsResponse response = service.getInsights("int-1");

        assertEquals("int-1", response.getIntegrationId());
        assertEquals(0, response.getUseCaseCount());
        assertEquals(0, response.getTotalRuns());
        assertEquals(0, response.getUseCases().size());
    }

    @Test
    void getInsights_withUseCases_aggregatesCountsAndExcludesTestRunsViaRepository() {
        when(integrationRepository.findById("int-1")).thenReturn(Optional.of(new IntegrationEntity()));

        WorkflowDefinition wf = WorkflowDefinition.builder()
                .id("wf-1")
                .name("Sync Contacts")
                .useCaseTitle("Daily sync")
                .integrationId("int-1")
                .build();
        when(workflowDefinitionRepository.findByIntegrationId("int-1")).thenReturn(List.of(wf));

        when(workflowExecutionRepository.countByWorkflowDefinitionIdInAndTargetTaskIdIsNull(List.of("wf-1")))
                .thenReturn(10L);
        when(workflowExecutionRepository.countByWorkflowDefinitionIdInAndTargetTaskIdIsNullAndStatus(
                List.of("wf-1"), WorkflowExecutionStatus.COMPLETED)).thenReturn(7L);
        when(workflowExecutionRepository.countByWorkflowDefinitionIdInAndTargetTaskIdIsNullAndStatus(
                List.of("wf-1"), WorkflowExecutionStatus.FAILED)).thenReturn(2L);

        WorkflowExecution latest = new WorkflowExecution();
        latest.setStartTime(Instant.parse("2026-01-15T10:00:00Z"));
        when(workflowExecutionRepository.findFirstByWorkflowDefinitionIdInAndTargetTaskIdIsNullOrderByStartTimeDesc(
                List.of("wf-1"))).thenReturn(Optional.of(latest));

        when(workflowExecutionRepository.countByWorkflowDefinitionIdAndTargetTaskIdIsNull("wf-1"))
                .thenReturn(10L);
        when(workflowExecutionRepository.countByWorkflowDefinitionIdAndTargetTaskIdIsNullAndStatus(
                eq("wf-1"), eq(WorkflowExecutionStatus.COMPLETED))).thenReturn(7L);
        when(workflowExecutionRepository.countByWorkflowDefinitionIdAndTargetTaskIdIsNullAndStatus(
                eq("wf-1"), eq(WorkflowExecutionStatus.FAILED))).thenReturn(2L);
        when(workflowExecutionRepository.findFirstByWorkflowDefinitionIdAndTargetTaskIdIsNullOrderByStartTimeDesc("wf-1"))
                .thenReturn(Optional.of(latest));

        IntegrationInsightsResponse response = service.getInsights("int-1");

        assertEquals(1, response.getUseCaseCount());
        assertEquals(10, response.getTotalRuns());
        assertEquals(7, response.getCompletedRuns());
        assertEquals(2, response.getFailedRuns());
        assertEquals(1, response.getInProgressRuns());

        UseCaseInsightsItem row = response.getUseCases().get(0);
        assertEquals("wf-1", row.getWorkflowDefinitionId());
        assertEquals("Daily sync", row.getUseCaseTitle());
        assertEquals(10, row.getTotalRuns());
        assertEquals(1, row.getInProgressRuns());

        verify(workflowExecutionRepository).countByWorkflowDefinitionIdInAndTargetTaskIdIsNull(any());
    }

    @Test
    void getInsights_noRuns_lastRunAtIsNull() {
        when(integrationRepository.findById("int-1")).thenReturn(Optional.of(new IntegrationEntity()));
        WorkflowDefinition wf = WorkflowDefinition.builder().id("wf-1").name("Empty").integrationId("int-1").build();
        when(workflowDefinitionRepository.findByIntegrationId("int-1")).thenReturn(List.of(wf));
        when(workflowExecutionRepository.countByWorkflowDefinitionIdInAndTargetTaskIdIsNull(List.of("wf-1")))
                .thenReturn(0L);
        when(workflowExecutionRepository.countByWorkflowDefinitionIdInAndTargetTaskIdIsNullAndStatus(
                List.of("wf-1"), WorkflowExecutionStatus.COMPLETED)).thenReturn(0L);
        when(workflowExecutionRepository.countByWorkflowDefinitionIdInAndTargetTaskIdIsNullAndStatus(
                List.of("wf-1"), WorkflowExecutionStatus.FAILED)).thenReturn(0L);
        when(workflowExecutionRepository.findFirstByWorkflowDefinitionIdInAndTargetTaskIdIsNullOrderByStartTimeDesc(
                List.of("wf-1"))).thenReturn(Optional.empty());
        when(workflowExecutionRepository.countByWorkflowDefinitionIdAndTargetTaskIdIsNull("wf-1")).thenReturn(0L);
        when(workflowExecutionRepository.countByWorkflowDefinitionIdAndTargetTaskIdIsNullAndStatus(
                eq("wf-1"), eq(WorkflowExecutionStatus.COMPLETED))).thenReturn(0L);
        when(workflowExecutionRepository.countByWorkflowDefinitionIdAndTargetTaskIdIsNullAndStatus(
                eq("wf-1"), eq(WorkflowExecutionStatus.FAILED))).thenReturn(0L);
        when(workflowExecutionRepository.findFirstByWorkflowDefinitionIdAndTargetTaskIdIsNullOrderByStartTimeDesc("wf-1"))
                .thenReturn(Optional.empty());

        IntegrationInsightsResponse response = service.getInsights("int-1");

        assertNull(response.getLastRunAt());
        assertNull(response.getUseCases().get(0).getLastRunAt());
    }

    @Test
    void getUseCaseInsights_workflowNotOnIntegration_throws() {
        when(integrationRepository.findById("int-1")).thenReturn(Optional.of(new IntegrationEntity()));
        WorkflowDefinition wf = WorkflowDefinition.builder().id("wf-1").integrationId("other-int").build();
        when(workflowDefinitionRepository.findById("wf-1")).thenReturn(Optional.of(wf));

        assertThrows(IllegalArgumentException.class, () -> service.getUseCaseInsights("int-1", "wf-1"));
    }

    @Test
    void getUseCaseInsights_returnsMetricsAndRecentExecutions() {
        when(integrationRepository.findById("int-1")).thenReturn(Optional.of(new IntegrationEntity()));
        WorkflowDefinition wf = WorkflowDefinition.builder()
                .id("wf-1")
                .name("Sync")
                .useCaseTitle("Daily sync")
                .useCaseDescription("Desc")
                .integrationId("int-1")
                .build();
        when(workflowDefinitionRepository.findById("wf-1")).thenReturn(Optional.of(wf));

        when(workflowExecutionRepository.countByWorkflowDefinitionIdAndTargetTaskIdIsNull("wf-1")).thenReturn(3L);
        when(workflowExecutionRepository.countByWorkflowDefinitionIdAndTargetTaskIdIsNullAndStatus(
                eq("wf-1"), eq(WorkflowExecutionStatus.COMPLETED))).thenReturn(2L);
        when(workflowExecutionRepository.countByWorkflowDefinitionIdAndTargetTaskIdIsNullAndStatus(
                eq("wf-1"), eq(WorkflowExecutionStatus.FAILED))).thenReturn(1L);

        WorkflowExecution recent = new WorkflowExecution();
        recent.setId("exec-1");
        recent.setStatus(WorkflowExecutionStatus.COMPLETED);
        recent.setStartTime(Instant.parse("2026-01-15T10:00:00Z"));
        when(workflowExecutionRepository.findFirstByWorkflowDefinitionIdAndTargetTaskIdIsNullOrderByStartTimeDesc("wf-1"))
                .thenReturn(Optional.of(recent));
        when(workflowExecutionRepository.findTop10ByWorkflowDefinitionIdAndTargetTaskIdIsNullOrderByStartTimeDesc("wf-1"))
                .thenReturn(List.of(recent));

        UseCaseInsightsResponse response = service.getUseCaseInsights("int-1", "wf-1");

        assertEquals("int-1", response.getIntegrationId());
        assertEquals("wf-1", response.getWorkflowDefinitionId());
        assertEquals("Daily sync", response.getUseCaseTitle());
        assertEquals(3, response.getTotalRuns());
        assertEquals(1, response.getRecentExecutions().size());
        assertEquals("exec-1", response.getRecentExecutions().get(0).getExecutionId());
        assertTrue(response.getInProgressRuns() == 0);
    }
}
