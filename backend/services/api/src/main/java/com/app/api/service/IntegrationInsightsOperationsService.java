package com.app.api.service;

import com.app.api.config.properties.WorkflowApiProperties;
import com.app.api.dto.IntegrationInsightsResponse;
import com.app.api.dto.IntegrationInsightsRetryItemResult;
import com.app.api.dto.IntegrationInsightsRetryResponse;
import com.app.api.dto.RecentExecutionInsightItem;
import com.app.api.dto.UseCaseInsightsResponse;
import com.app.api.util.CsvWriter;
import com.app.common.constant.ExecutionType;
import com.app.common.constant.WorkflowExecutionStatus;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.entity.WorkflowExecution;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.exception.ValidationException;
import com.app.common.model.trigger.TriggerType;
import com.app.common.model.variable.VariableValue;
import com.app.persistence.entity.IntegrationEntity;
import com.app.persistence.repository.IntegrationRepository;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import com.app.persistence.repository.WorkflowExecutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class IntegrationInsightsOperationsService {

    private final IntegrationRepository integrationRepository;
    private final WorkflowDefinitionRepository workflowDefinitionRepository;
    private final WorkflowExecutionRepository workflowExecutionRepository;
    private final IntegrationInsightsService integrationInsightsService;
    private final WorkflowExecutionService workflowExecutionService;
    private final WorkflowApiProperties workflowApiProperties;

    public byte[] exportInsightsCsv(String integrationId) {
        IntegrationEntity integration = integrationRepository.findById(integrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Integration", integrationId));

        IntegrationInsightsResponse insights = integrationInsightsService.getInsights(integrationId);
        Instant exportedAt = Instant.now();

        CsvWriter csv = CsvWriter.create()
                .header(
                        "scope",
                        "integration_id",
                        "integration_name",
                        "exported_at_utc",
                        "workflow_definition_id",
                        "use_case_title",
                        "workflow_name",
                        "total_runs",
                        "completed_runs",
                        "failed_runs",
                        "in_progress_runs",
                        "last_run_at_utc")
                .row(
                        "INTEGRATION",
                        integrationId,
                        nullToEmpty(integration.getName()),
                        CsvWriter.formatInstant(exportedAt),
                        "",
                        "",
                        "",
                        CsvWriter.formatLong(insights.getTotalRuns()),
                        CsvWriter.formatLong(insights.getCompletedRuns()),
                        CsvWriter.formatLong(insights.getFailedRuns()),
                        CsvWriter.formatLong(insights.getInProgressRuns()),
                        CsvWriter.formatInstant(insights.getLastRunAt()));

        for (var useCase : insights.getUseCases()) {
            csv.row(
                    "USE_CASE",
                    integrationId,
                    nullToEmpty(integration.getName()),
                    CsvWriter.formatInstant(exportedAt),
                    nullToEmpty(useCase.getWorkflowDefinitionId()),
                    nullToEmpty(useCase.getUseCaseTitle()),
                    nullToEmpty(useCase.getWorkflowName()),
                    CsvWriter.formatLong(useCase.getTotalRuns()),
                    CsvWriter.formatLong(useCase.getCompletedRuns()),
                    CsvWriter.formatLong(useCase.getFailedRuns()),
                    CsvWriter.formatLong(useCase.getInProgressRuns()),
                    CsvWriter.formatInstant(useCase.getLastRunAt()));
        }

        return csv.toUtf8BytesWithBom();
    }

    public String exportFilename(String integrationId) {
        IntegrationEntity integration = integrationRepository.findById(integrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Integration", integrationId));
        String slug = sanitizeFilenameSegment(integration.getName());
        if (slug.isBlank()) {
            slug = "integration";
        }
        return "integration-insights-" + slug + "-" + integrationId + ".csv";
    }

    public byte[] exportUseCaseInsightsCsv(String integrationId, String workflowDefinitionId) {
        IntegrationEntity integration = integrationRepository.findById(integrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Integration", integrationId));

        UseCaseInsightsResponse detail = integrationInsightsService.getUseCaseInsights(
                integrationId, workflowDefinitionId);
        Instant exportedAt = Instant.now();

        CsvWriter csv = CsvWriter.create()
                .header(
                        "record_type",
                        "integration_id",
                        "integration_name",
                        "exported_at_utc",
                        "workflow_definition_id",
                        "use_case_title",
                        "workflow_name",
                        "total_runs",
                        "completed_runs",
                        "failed_runs",
                        "in_progress_runs",
                        "last_run_at_utc",
                        "execution_id",
                        "execution_status",
                        "execution_start_utc",
                        "execution_end_utc")
                .row(
                        "USE_CASE_SUMMARY",
                        integrationId,
                        nullToEmpty(integration.getName()),
                        CsvWriter.formatInstant(exportedAt),
                        nullToEmpty(detail.getWorkflowDefinitionId()),
                        nullToEmpty(detail.getUseCaseTitle()),
                        nullToEmpty(detail.getWorkflowName()),
                        CsvWriter.formatLong(detail.getTotalRuns()),
                        CsvWriter.formatLong(detail.getCompletedRuns()),
                        CsvWriter.formatLong(detail.getFailedRuns()),
                        CsvWriter.formatLong(detail.getInProgressRuns()),
                        CsvWriter.formatInstant(detail.getLastRunAt()),
                        "",
                        "",
                        "",
                        "");

        for (RecentExecutionInsightItem run : detail.getRecentExecutions()) {
            csv.row(
                    "RECENT_RUN",
                    integrationId,
                    nullToEmpty(integration.getName()),
                    CsvWriter.formatInstant(exportedAt),
                    nullToEmpty(detail.getWorkflowDefinitionId()),
                    nullToEmpty(detail.getUseCaseTitle()),
                    nullToEmpty(detail.getWorkflowName()),
                    "",
                    "",
                    "",
                    "",
                    "",
                    nullToEmpty(run.getExecutionId()),
                    run.getStatus() != null ? run.getStatus().name() : "",
                    CsvWriter.formatInstant(run.getStartTime()),
                    CsvWriter.formatInstant(run.getEndTime()));
        }

        return csv.toUtf8BytesWithBom();
    }

    public String exportUseCaseFilename(String integrationId, String workflowDefinitionId) {
        integrationRepository.findById(integrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Integration", integrationId));

        UseCaseInsightsResponse detail = integrationInsightsService.getUseCaseInsights(
                integrationId, workflowDefinitionId);

        String useCaseSlug = sanitizeFilenameSegment(
                Optional.ofNullable(detail.getUseCaseTitle()).filter(s -> !s.isBlank())
                        .orElse(detail.getWorkflowName()));
        if (useCaseSlug.isBlank()) {
            useCaseSlug = "use-case";
        }
        return "use-case-insights-" + useCaseSlug + "-" + workflowDefinitionId + ".csv";
    }

    public IntegrationInsightsRetryResponse retryFailedExecutions(
            String integrationId,
            Optional<String> workflowDefinitionId) {
        integrationRepository.findById(integrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Integration", integrationId));

        List<String> definitionIds = resolveDefinitionIds(integrationId, workflowDefinitionId);

        int batchLimit = workflowApiProperties.getInsights().getMaxRetryBatchSize();
        if (batchLimit <= 0) {
            throw new ValidationException("Insights retry batch size must be positive");
        }

        long eligible = countFailedExecutions(definitionIds);
        if (eligible == 0) {
            return IntegrationInsightsRetryResponse.builder()
                    .integrationId(integrationId)
                    .eligibleFailedExecutions(0)
                    .batchLimit(batchLimit)
                    .selectedForRetry(0)
                    .queuedCount(0)
                    .triggerFailureCount(0)
                    .batchLimitApplied(false)
                    .results(List.of())
                    .build();
        }

        Page<WorkflowExecution> page = fetchFailedExecutions(definitionIds, batchLimit);
        List<WorkflowExecution> toRetry = page.getContent();

        List<IntegrationInsightsRetryItemResult> results = new ArrayList<>();
        int queued = 0;
        int triggerFailures = 0;

        for (WorkflowExecution source : toRetry) {
            IntegrationInsightsRetryItemResult item = retrySingleExecution(integrationId, source);
            results.add(item);
            if (item.isQueued()) {
                queued++;
            } else {
                triggerFailures++;
            }
        }

        boolean batchLimitApplied = eligible > batchLimit;

        log.info(
                "Integration insights retry completed: integrationId={}, eligible={}, selected={}, queued={}, triggerFailures={}, batchLimitApplied={}",
                integrationId,
                eligible,
                toRetry.size(),
                queued,
                triggerFailures,
                batchLimitApplied);

        return IntegrationInsightsRetryResponse.builder()
                .integrationId(integrationId)
                .eligibleFailedExecutions(eligible)
                .batchLimit(batchLimit)
                .selectedForRetry(toRetry.size())
                .queuedCount(queued)
                .triggerFailureCount(triggerFailures)
                .batchLimitApplied(batchLimitApplied)
                .results(results)
                .build();
    }

    private IntegrationInsightsRetryItemResult retrySingleExecution(
            String integrationId,
            WorkflowExecution source) {
        String definitionId = source.getWorkflowDefinitionId();
        ExecutionType executionType = source.getExecutionType() != null
                ? source.getExecutionType()
                : ExecutionType.ASYNC;
        Map<String, VariableValue> inputs = copyTriggerInputs(source.getTriggerInputs());

        try {
            WorkflowExecution newExecution = workflowExecutionService.triggerExecution(
                    definitionId,
                    inputs,
                    executionType,
                    TriggerType.MANUAL);

            log.info(
                    "Retried failed execution: integrationId={}, sourceExecutionId={}, newExecutionId={}, workflowDefinitionId={}",
                    integrationId,
                    source.getId(),
                    newExecution.getId(),
                    definitionId);

            return IntegrationInsightsRetryItemResult.builder()
                    .sourceExecutionId(source.getId())
                    .workflowDefinitionId(definitionId)
                    .newExecutionId(newExecution.getId())
                    .queued(true)
                    .build();
        } catch (Exception ex) {
            log.warn(
                    "Failed to queue retry for execution: integrationId={}, sourceExecutionId={}, workflowDefinitionId={}, reason={}",
                    integrationId,
                    source.getId(),
                    definitionId,
                    ex.getMessage());

            return IntegrationInsightsRetryItemResult.builder()
                    .sourceExecutionId(source.getId())
                    .workflowDefinitionId(definitionId)
                    .queued(false)
                    .errorMessage(ex.getMessage())
                    .build();
        }
    }

    private Map<String, VariableValue> copyTriggerInputs(Map<String, VariableValue> triggerInputs) {
        if (triggerInputs == null || triggerInputs.isEmpty()) {
            return null;
        }
        return new HashMap<>(triggerInputs);
    }

    private List<String> resolveDefinitionIds(
            String integrationId,
            Optional<String> workflowDefinitionId) {
        if (workflowDefinitionId.isPresent()) {
            String workflowId = workflowDefinitionId.get();
            WorkflowDefinition definition = workflowDefinitionRepository.findById(workflowId)
                    .orElseThrow(() -> new ResourceNotFoundException("Workflow", workflowId));
            if (!integrationId.equals(definition.getIntegrationId())) {
                throw new IllegalArgumentException("Workflow is not assigned to this integration");
            }
            return List.of(workflowId);
        }

        List<WorkflowDefinition> definitions =
                workflowDefinitionRepository.findByIntegrationId(integrationId);
        return definitions.stream().map(WorkflowDefinition::getId).toList();
    }

    private long countFailedExecutions(List<String> definitionIds) {
        if (definitionIds.isEmpty()) {
            return 0;
        }
        if (definitionIds.size() == 1) {
            return workflowExecutionRepository.countByWorkflowDefinitionIdAndTargetTaskIdIsNullAndStatus(
                    definitionIds.get(0), WorkflowExecutionStatus.FAILED);
        }
        return workflowExecutionRepository.countByWorkflowDefinitionIdInAndTargetTaskIdIsNullAndStatus(
                definitionIds, WorkflowExecutionStatus.FAILED);
    }

    private Page<WorkflowExecution> fetchFailedExecutions(List<String> definitionIds, int batchLimit) {
        PageRequest page = PageRequest.of(
                0,
                batchLimit,
                Sort.by(Sort.Direction.DESC, "startTime"));

        if (definitionIds.isEmpty()) {
            return Page.empty(page);
        }
        if (definitionIds.size() == 1) {
            return workflowExecutionRepository.findByWorkflowDefinitionIdAndTargetTaskIdIsNullAndStatus(
                    definitionIds.get(0),
                    WorkflowExecutionStatus.FAILED,
                    page);
        }
        return workflowExecutionRepository.findByWorkflowDefinitionIdInAndTargetTaskIdIsNullAndStatus(
                definitionIds,
                WorkflowExecutionStatus.FAILED,
                page);
    }

    private static String nullToEmpty(String value) {
        return value != null ? value : "";
    }

    private static String sanitizeFilenameSegment(String name) {
        if (name == null) {
            return "";
        }
        String trimmed = name.trim().toLowerCase();
        return trimmed.replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
    }
}
