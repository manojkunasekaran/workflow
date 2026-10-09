package com.app.api.service;

import com.app.api.config.properties.WorkflowApiProperties;
import com.app.api.dto.IntegrationInsightsResponse;
import com.app.api.dto.IntegrationInsightsRetryResponse;
import com.app.api.dto.RecentExecutionInsightItem;
import com.app.api.dto.UseCaseInsightsItem;
import com.app.api.dto.UseCaseInsightsResponse;
import com.app.common.constant.ExecutionType;
import com.app.common.constant.WorkflowExecutionStatus;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.entity.WorkflowExecution;
import com.app.common.exception.ResourceNotFoundException;
import com.app.persistence.entity.IntegrationEntity;
import com.app.persistence.repository.IntegrationRepository;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import com.app.persistence.repository.WorkflowExecutionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IntegrationInsightsOperationsServiceTest {

    @Mock
    private IntegrationRepository integrationRepository;

    @Mock
    private WorkflowDefinitionRepository workflowDefinitionRepository;

    @Mock
    private WorkflowExecutionRepository workflowExecutionRepository;

    @Mock
    private IntegrationInsightsService integrationInsightsService;

    @Mock
    private WorkflowExecutionService workflowExecutionService;

    private WorkflowApiProperties workflowApiProperties;

    @InjectMocks
    private IntegrationInsightsOperationsService service;

    @BeforeEach
    void setUpProperties() {
        workflowApiProperties = new WorkflowApiProperties();
        workflowApiProperties.getInsights().setMaxRetryBatchSize(2);
        service = new IntegrationInsightsOperationsService(
                integrationRepository,
                workflowDefinitionRepository,
                workflowExecutionRepository,
                integrationInsightsService,
                workflowExecutionService,
                workflowApiProperties);
    }

    @Test
    void exportInsightsCsv_unknownIntegration_throwsNotFound() {
        when(integrationRepository.findById("missing")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.exportInsightsCsv("missing"));
    }

    @Test
    void exportInsightsCsv_includesSummaryAndUseCaseRows() {
        IntegrationEntity integration = new IntegrationEntity();
        integration.setId("int-1");
        integration.setName("Gmail to CRM");
        when(integrationRepository.findById("int-1")).thenReturn(Optional.of(integration));

        UseCaseInsightsItem useCase = UseCaseInsightsItem.builder()
                .workflowDefinitionId("wf-1")
                .useCaseTitle("Sync contacts")
                .workflowName("sync-contacts")
                .totalRuns(10)
                .completedRuns(8)
                .failedRuns(2)
                .inProgressRuns(0)
                .build();

        when(integrationInsightsService.getInsights("int-1")).thenReturn(
                IntegrationInsightsResponse.builder()
                        .integrationId("int-1")
                        .totalRuns(10)
                        .completedRuns(8)
                        .failedRuns(2)
                        .inProgressRuns(0)
                        .useCases(List.of(useCase))
                        .build());

        byte[] csv = service.exportInsightsCsv("int-1");
        String text = new String(csv, StandardCharsets.UTF_8);

        assertTrue(text.contains("INTEGRATION"));
        assertTrue(text.contains("USE_CASE"));
        assertTrue(text.contains("Gmail to CRM"));
        assertTrue(text.contains("Sync contacts"));
    }

    @Test
    void exportUseCaseInsightsCsv_includesSummaryAndRecentRuns() {
        IntegrationEntity integration = new IntegrationEntity();
        integration.setId("int-1");
        integration.setName("Gmail to CRM");
        when(integrationRepository.findById("int-1")).thenReturn(Optional.of(integration));

        when(integrationInsightsService.getUseCaseInsights("int-1", "wf-1")).thenReturn(
                UseCaseInsightsResponse.builder()
                        .integrationId("int-1")
                        .workflowDefinitionId("wf-1")
                        .useCaseTitle("Sync contacts")
                        .workflowName("sync-contacts")
                        .totalRuns(5)
                        .completedRuns(4)
                        .failedRuns(1)
                        .inProgressRuns(0)
                        .recentExecutions(List.of(
                                RecentExecutionInsightItem.builder()
                                        .executionId("exec-1")
                                        .status(WorkflowExecutionStatus.FAILED)
                                        .build()))
                        .build());

        byte[] csv = service.exportUseCaseInsightsCsv("int-1", "wf-1");
        String text = new String(csv, StandardCharsets.UTF_8);

        assertTrue(text.contains("USE_CASE_SUMMARY"));
        assertTrue(text.contains("RECENT_RUN"));
        assertTrue(text.contains("exec-1"));
    }

    @Test
    void retryFailedExecutions_noFailures_returnsEmptyResult() {
        when(integrationRepository.findById("int-1")).thenReturn(Optional.of(new IntegrationEntity()));
        WorkflowDefinition def = new WorkflowDefinition();
        def.setId("wf-1");
        when(workflowDefinitionRepository.findByIntegrationId("int-1")).thenReturn(List.of(def));
        when(workflowExecutionRepository.countByWorkflowDefinitionIdAndTargetTaskIdIsNullAndStatus(
                eq("wf-1"), eq(WorkflowExecutionStatus.FAILED))).thenReturn(0L);

        IntegrationInsightsRetryResponse response =
                service.retryFailedExecutions("int-1", Optional.empty());

        assertEquals(0, response.getEligibleFailedExecutions());
        assertEquals(0, response.getQueuedCount());
        verify(workflowExecutionService, never()).triggerExecution(any(), any(), any(), any());
    }

    @Test
    void retryFailedExecutions_queuesNewExecutionsWithOriginalInputs() {
        when(integrationRepository.findById("int-1")).thenReturn(Optional.of(new IntegrationEntity()));
        WorkflowDefinition def = new WorkflowDefinition();
        def.setId("wf-1");
        when(workflowDefinitionRepository.findByIntegrationId("int-1")).thenReturn(List.of(def));
        when(workflowExecutionRepository.countByWorkflowDefinitionIdAndTargetTaskIdIsNullAndStatus(
                eq("wf-1"), eq(WorkflowExecutionStatus.FAILED))).thenReturn(1L);

        WorkflowExecution failed = new WorkflowExecution();
        failed.setId("exec-failed");
        failed.setWorkflowDefinitionId("wf-1");
        failed.setExecutionType(ExecutionType.ASYNC);

        when(workflowExecutionRepository.findByWorkflowDefinitionIdAndTargetTaskIdIsNullAndStatus(
                eq("wf-1"),
                eq(WorkflowExecutionStatus.FAILED),
                any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(failed)));

        WorkflowExecution queued = new WorkflowExecution();
        queued.setId("exec-new");
        when(workflowExecutionService.triggerExecution(
                eq("wf-1"), any(), eq(ExecutionType.ASYNC), any()))
                .thenReturn(queued);

        IntegrationInsightsRetryResponse response =
                service.retryFailedExecutions("int-1", Optional.empty());

        assertEquals(1, response.getQueuedCount());
        assertEquals(0, response.getTriggerFailureCount());
        assertEquals("exec-new", response.getResults().get(0).getNewExecutionId());
    }
}
