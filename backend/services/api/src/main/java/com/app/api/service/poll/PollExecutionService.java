package com.app.api.service.poll;

import com.app.api.config.properties.WorkflowApiProperties;
import com.app.api.dto.PollReprocessRequest;
import com.app.api.dto.PollReprocessResult;
import com.app.api.dto.PollStateResponse;
import com.app.api.dto.PollTestResult;
import com.app.api.service.WorkflowExecutionService;
import com.app.common.constant.ExecutionType;
import com.app.common.entity.TriggerPollState;
import com.app.common.entity.TriggerRegistration;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.exception.ValidationException;
import com.app.common.model.trigger.ChangeDetectionConfig;
import com.app.common.model.trigger.PollConfig;
import com.app.common.model.trigger.PollEventSemantics;
import com.app.common.model.trigger.PollRunMode;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.common.model.variable.VariableType;
import com.app.common.model.variable.VariableValue;
import com.app.common.entity.TriggerPollLog;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Executes poll cycles: HTTP fetch, change detection, and workflow triggering.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PollExecutionService {

    private final WorkflowDefinitionRepository definitionRepository;
    private final TriggerRegistrationService registrationService;
    private final PollHttpExecutor httpExecutor;
    private final PollResponseParser responseParser;
    private final PollFilterEvaluator filterEvaluator;
    private final ChangeDetectionEngine changeDetectionEngine;
    private final WorkflowExecutionService executionService;
    private final WorkflowApiProperties apiProperties;
    private final PollMetrics pollMetrics;

    public void executePoll(String workflowDefinitionId) {
        runPoll(workflowDefinitionId, false);
    }

    public PollTestResult testPoll(String workflowDefinitionId) {
        PollCycleResult result = runPoll(workflowDefinitionId, true);
        return PollTestResult.builder()
                .success(result.success)
                .durationMs(result.durationMs)
                .itemsFetched(result.itemsFetched)
                .itemsNew(result.itemsNew)
                .itemsUpdated(result.itemsUpdated)
                .itemsSkipped(result.itemsSkipped)
                .newItems(result.triggerItems)
                .skippedItems(result.skippedItems)
                .error(result.error)
                .warning(result.warning)
                .build();
    }

    public PollStateResponse getPollState(String workflowDefinitionId) {
        TriggerRegistration registration = registrationService.findByWorkflowDefinitionId(workflowDefinitionId)
                .orElseThrow(() -> new ResourceNotFoundException("TriggerRegistration", workflowDefinitionId));

        TriggerPollState state = registrationService.loadOrCreateState(
                registration, PollConfig.builder().build());

        return PollStateResponse.builder()
                .registrationId(registration.getId())
                .status(registration.getStatus().name())
                .lastPollAt(registration.getLastPollAt())
                .lastSuccessAt(registration.getLastSuccessAt())
                .lastErrorMessage(registration.getLastErrorMessage())
                .consecutiveFailures(registration.getConsecutiveFailures())
                .seenKeyCount(state.getSeenKeys().size())
                .baselineEstablished(state.isBaselineEstablished())
                .lastResponseHash(state.getLastResponseHash())
                .build();
    }

    public Page<TriggerPollLog> getPollLogs(String workflowDefinitionId, Pageable pageable) {
        return registrationService.getPollLogs(workflowDefinitionId, pageable);
    }

    public PollReprocessResult reprocessItems(String workflowDefinitionId, PollReprocessRequest request) {
        if (request == null || request.getItemKeys() == null || request.getItemKeys().isEmpty()) {
            throw new ValidationException("At least one item key is required for reprocess.");
        }

        WorkflowDefinition definition = definitionRepository.findById(workflowDefinitionId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowDefinition", workflowDefinitionId));

        TriggerConfig trigger = definition.getTrigger();
        if (trigger == null || trigger.getType() != TriggerType.POLL || trigger.getPoll() == null) {
            throw new ValidationException("Workflow does not have an active POLL trigger configured.");
        }

        PollConfig poll = trigger.getPoll();
        TriggerRegistration registration = registrationService.findByWorkflowDefinitionId(workflowDefinitionId)
                .orElseThrow(() -> new ResourceNotFoundException("TriggerRegistration", workflowDefinitionId));

        Set<String> requestedKeys = new HashSet<>(request.getItemKeys());
        long start = System.currentTimeMillis();
        PollHttpResult httpResult = httpExecutor.execute(poll.getHttp());
        long durationMs = httpResult.getDurationMs() > 0 ? httpResult.getDurationMs() : System.currentTimeMillis() - start;

        if (!httpResult.isSuccess()) {
            registrationService.writePollLog(
                    registration, durationMs, 0, 0, 0, 0, false, httpResult.getError(), true, request.getItemKeys());
            return PollReprocessResult.builder()
                    .success(false)
                    .error(httpResult.getError())
                    .unmatchedKeys(new ArrayList<>(requestedKeys))
                    .build();
        }

        ChangeDetectionConfig detection = poll.getDetection();
        List<Map<String, Object>> allItems = responseParser.extractItems(httpResult.getBody(), detection);
        List<Map<String, Object>> matchedItems = new ArrayList<>();
        List<String> matchedKeys = new ArrayList<>();

        for (Map<String, Object> item : allItems) {
            String key = responseParser.extractItemKey(item, detection);
            if (key != null && requestedKeys.contains(key)) {
                matchedItems.add(item);
                matchedKeys.add(key);
            }
        }

        Set<String> unmatchedKeys = new HashSet<>(requestedKeys);
        unmatchedKeys.removeAll(matchedKeys);

        boolean triggered = false;
        if (!matchedItems.isEmpty()) {
            triggered = triggerWorkflows(definition.getId(), poll, matchedItems);
        }

        registrationService.writePollLog(
                registration,
                durationMs,
                allItems.size(),
                matchedItems.size(),
                allItems.size() - matchedItems.size(),
                0,
                triggered,
                null,
                true,
                matchedKeys);

        return PollReprocessResult.builder()
                .success(true)
                .itemsMatched(matchedItems.size())
                .itemsTriggered(matchedItems.size())
                .matchedItems(matchedItems)
                .triggeredKeys(matchedKeys)
                .unmatchedKeys(new ArrayList<>(unmatchedKeys))
                .build();
    }

    private PollCycleResult runPoll(String workflowDefinitionId, boolean testMode) {
        WorkflowDefinition definition = definitionRepository.findById(workflowDefinitionId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowDefinition", workflowDefinitionId));

        TriggerConfig trigger = definition.getTrigger();
        if (trigger == null || trigger.getType() != TriggerType.POLL || trigger.getPoll() == null) {
            throw new ValidationException("Workflow does not have an active POLL trigger configured.");
        }

        PollConfig poll = trigger.getPoll();
        TriggerRegistration registration = registrationService.findByWorkflowDefinitionId(workflowDefinitionId)
                .orElseThrow(() -> new ResourceNotFoundException("TriggerRegistration", workflowDefinitionId));

        TriggerPollState state = registrationService.loadOrCreateState(registration, poll);
        TriggerPollState stateSnapshot = cloneState(state);

        long start = System.currentTimeMillis();
        PollHttpResult httpResult = httpExecutor.execute(poll.getHttp(), state.getLastEtag());
        long durationMs = httpResult.getDurationMs() > 0 ? httpResult.getDurationMs() : System.currentTimeMillis() - start;

        if (!httpResult.isSuccess()) {
            if (!testMode) {
                registrationService.recordPollFailure(registration, httpResult.getError());
                registrationService.writePollLog(registration, durationMs, 0, 0, 0, 0, false, httpResult.getError());
                pollMetrics.recordPoll(durationMs, 0, true);
            }
            return PollCycleResult.failure(httpResult.getError(), durationMs);
        }

        if (httpResult.getEtag() != null) {
            state.setLastEtag(httpResult.getEtag());
        }

        if (httpResult.isNotModified()) {
            if (!testMode) {
                registrationService.saveState(state);
                registrationService.recordPollSuccess(registration);
                registrationService.writePollLog(registration, durationMs, 0, 0, 0, 0, false, null);
                pollMetrics.recordPoll(durationMs, 0, false);
            }
            return PollCycleResult.builder()
                    .success(true)
                    .durationMs(durationMs)
                    .itemsFetched(0)
                    .itemsNew(0)
                    .itemsUpdated(0)
                    .itemsSkipped(0)
                    .triggerItems(List.of())
                    .skippedItems(List.of())
                    .build();
        }

        ChangeDetectionConfig detection = poll.getDetection();
        int maxItems = resolveMaxItems(detection);
        List<Map<String, Object>> allItems = responseParser.extractItems(httpResult.getBody(), detection);
        int itemsFetched = allItems.size();

        List<Map<String, Object>> filteredItems = allItems.stream()
                .filter(item -> filterEvaluator.passesAll(item, poll.getFilters()))
                .limit(maxItems)
                .collect(Collectors.toList());

        ChangeDetectionResult detectionResult = changeDetectionEngine.detect(
                poll, state, filteredItems, httpResult.getRawBody(), httpResult.getBody(),
                apiProperties.getPoll().getMaxTrackedKeys());

        boolean triggered = false;
        if (!testMode && !detectionResult.getTriggerItems().isEmpty()) {
            triggered = triggerWorkflows(definition.getId(), poll, detectionResult.getTriggerItems());
        }

        if (testMode) {
            state = stateSnapshot;
        } else {
            registrationService.saveState(state);
            registrationService.recordPollSuccess(registration);
        }

        if (!testMode) {
            registrationService.writePollLog(
                    registration,
                    durationMs,
                    itemsFetched,
                    detectionResult.getItemsNew(),
                    detectionResult.getItemsSkipped(),
                    detectionResult.getItemsUpdated(),
                    triggered,
                    null);
            pollMetrics.recordPoll(durationMs, detectionResult.getItemsNew(), false);
        }

        return PollCycleResult.builder()
                .success(true)
                .durationMs(durationMs)
                .itemsFetched(itemsFetched)
                .itemsNew(detectionResult.getItemsNew())
                .itemsUpdated(detectionResult.getItemsUpdated())
                .itemsSkipped(detectionResult.getItemsSkipped())
                .triggerItems(detectionResult.getTriggerItems())
                .skippedItems(detectionResult.getSkippedItems())
                .warning(detectionResult.getWarning())
                .build();
    }

    private boolean triggerWorkflows(String definitionId, PollConfig poll, List<Map<String, Object>> items) {
        if (poll.getRunMode() == PollRunMode.BATCH) {
            Map<String, VariableValue> inputs = new HashMap<>();
            inputs.put("items", VariableValue.builder()
                    .name("items")
                    .type(VariableType.OBJECT)
                    .value(items)
                    .build());
            inputs.put("count", VariableValue.builder()
                    .name("count")
                    .type(VariableType.NUMBER)
                    .value(items.size())
                    .build());
            executionService.triggerExecution(definitionId, inputs, ExecutionType.ASYNC, TriggerType.POLL);
            return true;
        }

        for (Map<String, Object> item : items) {
            Map<String, VariableValue> inputs = new HashMap<>();
            for (Map.Entry<String, Object> entry : item.entrySet()) {
                inputs.put(entry.getKey(), toVariableValue(entry.getKey(), entry.getValue()));
            }
            executionService.triggerExecution(definitionId, inputs, ExecutionType.ASYNC, TriggerType.POLL);
        }
        return !items.isEmpty();
    }

    private VariableValue toVariableValue(String name, Object value) {
        VariableType type;
        if (value instanceof String) {
            type = VariableType.STRING;
        } else if (value instanceof Number) {
            type = VariableType.NUMBER;
        } else if (value instanceof Boolean) {
            type = VariableType.BOOLEAN;
        } else {
            type = VariableType.OBJECT;
        }
        return VariableValue.builder().name(name).type(type).value(value).build();
    }

    private int resolveMaxItems(ChangeDetectionConfig detection) {
        int configured = detection != null && detection.getMaxItemsPerPoll() != null
                ? detection.getMaxItemsPerPoll()
                : apiProperties.getPoll().getMaxItemsPerPoll();
        return Math.min(configured, apiProperties.getPoll().getMaxItemsPerPoll());
    }

    private TriggerPollState cloneState(TriggerPollState state) {
        return TriggerPollState.builder()
                .id(state.getId())
                .registrationId(state.getRegistrationId())
                .semantics(state.getSemantics())
                .lastResponseHash(state.getLastResponseHash())
                .lastEtag(state.getLastEtag())
                .cursorTimestamp(state.getCursorTimestamp())
                .seenKeys(new ArrayList<>(state.getSeenKeys()))
                .baselineEstablished(state.isBaselineEstablished())
                .build();
    }

    @lombok.Builder
    @lombok.Data
    private static class PollCycleResult {
        private boolean success;
        private long durationMs;
        private int itemsFetched;
        private int itemsNew;
        private int itemsUpdated;
        private int itemsSkipped;
        private List<Map<String, Object>> triggerItems;
        private List<Map<String, Object>> skippedItems;
        private String error;
        private String warning;

        static PollCycleResult failure(String error, long durationMs) {
            return PollCycleResult.builder().success(false).error(error).durationMs(durationMs).build();
        }
    }
}
