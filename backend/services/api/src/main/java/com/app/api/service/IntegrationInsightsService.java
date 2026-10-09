package com.app.api.service;

import com.app.api.dto.IntegrationInsightsResponse;
import com.app.api.dto.RecentExecutionInsightItem;
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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class IntegrationInsightsService {

    private final IntegrationRepository integrationRepository;
    private final WorkflowDefinitionRepository workflowDefinitionRepository;
    private final WorkflowExecutionRepository workflowExecutionRepository;

    public IntegrationInsightsResponse getInsights(String integrationId) {
        integrationRepository.findById(integrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Integration", integrationId));

        List<WorkflowDefinition> useCaseDefinitions =
                workflowDefinitionRepository.findByIntegrationId(integrationId);

        if (useCaseDefinitions.isEmpty()) {
            return IntegrationInsightsResponse.builder()
                    .integrationId(integrationId)
                    .useCaseCount(0)
                    .totalRuns(0)
                    .completedRuns(0)
                    .failedRuns(0)
                    .inProgressRuns(0)
                    .useCases(List.of())
                    .build();
        }

        List<String> definitionIds = useCaseDefinitions.stream()
                .map(WorkflowDefinition::getId)
                .toList();

        long totalRuns = workflowExecutionRepository
                .countByWorkflowDefinitionIdInAndTargetTaskIdIsNull(definitionIds);
        long completedRuns = workflowExecutionRepository
                .countByWorkflowDefinitionIdInAndTargetTaskIdIsNullAndStatus(
                        definitionIds, WorkflowExecutionStatus.COMPLETED);
        long failedRuns = workflowExecutionRepository
                .countByWorkflowDefinitionIdInAndTargetTaskIdIsNullAndStatus(
                        definitionIds, WorkflowExecutionStatus.FAILED);
        long inProgressRuns = totalRuns - completedRuns - failedRuns;

        Instant lastRunAt = workflowExecutionRepository
                .findFirstByWorkflowDefinitionIdInAndTargetTaskIdIsNullOrderByStartTimeDesc(definitionIds)
                .map(WorkflowExecution::getStartTime)
                .orElse(null);

        List<UseCaseInsightsItem> useCases = new ArrayList<>();
        for (WorkflowDefinition definition : useCaseDefinitions) {
            useCases.add(toUseCaseItem(definition));
        }
        useCases.sort(Comparator.comparing(IntegrationInsightsService::useCaseSortKey, String.CASE_INSENSITIVE_ORDER));

        return IntegrationInsightsResponse.builder()
                .integrationId(integrationId)
                .useCaseCount(useCaseDefinitions.size())
                .totalRuns(totalRuns)
                .completedRuns(completedRuns)
                .failedRuns(failedRuns)
                .inProgressRuns(inProgressRuns)
                .lastRunAt(lastRunAt)
                .useCases(useCases)
                .build();
    }

    public UseCaseInsightsResponse getUseCaseInsights(String integrationId, String workflowDefinitionId) {
        integrationRepository.findById(integrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Integration", integrationId));

        WorkflowDefinition definition = workflowDefinitionRepository.findById(workflowDefinitionId)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow", workflowDefinitionId));

        if (!integrationId.equals(definition.getIntegrationId())) {
            throw new IllegalArgumentException("Workflow is not assigned to this integration");
        }

        UseCaseInsightsItem metrics = toUseCaseItem(definition);
        List<RecentExecutionInsightItem> recentExecutions = workflowExecutionRepository
                .findTop10ByWorkflowDefinitionIdAndTargetTaskIdIsNullOrderByStartTimeDesc(workflowDefinitionId)
                .stream()
                .map(this::toRecentExecutionItem)
                .toList();

        return UseCaseInsightsResponse.builder()
                .integrationId(integrationId)
                .workflowDefinitionId(definition.getId())
                .workflowName(definition.getName())
                .useCaseTitle(definition.getUseCaseTitle())
                .useCaseDescription(definition.getUseCaseDescription())
                .totalRuns(metrics.getTotalRuns())
                .completedRuns(metrics.getCompletedRuns())
                .failedRuns(metrics.getFailedRuns())
                .inProgressRuns(metrics.getInProgressRuns())
                .lastRunAt(metrics.getLastRunAt())
                .recentExecutions(recentExecutions)
                .build();
    }

    private RecentExecutionInsightItem toRecentExecutionItem(WorkflowExecution execution) {
        return RecentExecutionInsightItem.builder()
                .executionId(execution.getId())
                .status(execution.getStatus())
                .startTime(execution.getStartTime())
                .endTime(execution.getEndTime())
                .build();
    }

    private UseCaseInsightsItem toUseCaseItem(WorkflowDefinition definition) {
        String definitionId = definition.getId();
        long totalRuns = workflowExecutionRepository.countByWorkflowDefinitionIdAndTargetTaskIdIsNull(definitionId);
        long completedRuns = workflowExecutionRepository.countByWorkflowDefinitionIdAndTargetTaskIdIsNullAndStatus(
                definitionId, WorkflowExecutionStatus.COMPLETED);
        long failedRuns = workflowExecutionRepository.countByWorkflowDefinitionIdAndTargetTaskIdIsNullAndStatus(
                definitionId, WorkflowExecutionStatus.FAILED);
        long inProgressRuns = totalRuns - completedRuns - failedRuns;

        Instant lastRunAt = workflowExecutionRepository
                .findFirstByWorkflowDefinitionIdAndTargetTaskIdIsNullOrderByStartTimeDesc(definitionId)
                .map(WorkflowExecution::getStartTime)
                .orElse(null);

        return UseCaseInsightsItem.builder()
                .workflowDefinitionId(definitionId)
                .workflowName(definition.getName())
                .useCaseTitle(definition.getUseCaseTitle())
                .totalRuns(totalRuns)
                .completedRuns(completedRuns)
                .failedRuns(failedRuns)
                .inProgressRuns(inProgressRuns)
                .lastRunAt(lastRunAt)
                .build();
    }

    private static String useCaseSortKey(UseCaseInsightsItem item) {
        return Optional.ofNullable(item.getUseCaseTitle())
                .filter(title -> !title.isBlank())
                .orElse(Optional.ofNullable(item.getWorkflowName()).orElse(""));
    }
}
