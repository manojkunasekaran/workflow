package com.app.api.service.poll;

import com.app.api.config.properties.WorkflowApiProperties;
import com.app.common.constant.TriggerRegistrationStatus;
import com.app.common.entity.TriggerPollLog;
import com.app.common.entity.TriggerPollState;
import com.app.common.entity.TriggerRegistration;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.model.trigger.PollConfig;
import com.app.common.model.trigger.PollEventSemantics;
import com.app.common.model.trigger.TriggerType;
import com.app.persistence.repository.TriggerPollLogRepository;
import com.app.persistence.repository.TriggerPollStateRepository;
import com.app.persistence.repository.TriggerRegistrationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Manages poll trigger registration, state, and audit logs.
 */
@Service
@RequiredArgsConstructor
public class TriggerRegistrationService {

    private final TriggerRegistrationRepository registrationRepository;
    private final TriggerPollStateRepository pollStateRepository;
    private final TriggerPollLogRepository pollLogRepository;
    private final WorkflowApiProperties apiProperties;

    public TriggerRegistration upsertOnSync(WorkflowDefinition definition) {
        PollConfig poll = definition.getTrigger().getPoll();
        TriggerRegistration registration = registrationRepository
                .findByWorkflowDefinitionId(definition.getId())
                .orElseGet(() -> TriggerRegistration.builder()
                        .id(UUID.randomUUID().toString())
                        .workflowDefinitionId(definition.getId())
                        .triggerType(TriggerType.POLL)
                        .status(TriggerRegistrationStatus.ACTIVE)
                        .activatedAt(Instant.now())
                        .build());
        registration.setStatus(poll.isActive()
                ? TriggerRegistrationStatus.ACTIVE
                : TriggerRegistrationStatus.PAUSED);
        if (registration.getActivatedAt() == null) {
            registration.setActivatedAt(Instant.now());
        }

        registration = registrationRepository.save(registration);
        ensurePollState(registration, poll);
        return registration;
    }

    public void deactivate(String workflowDefinitionId) {
        registrationRepository.findByWorkflowDefinitionId(workflowDefinitionId)
                .ifPresent(reg -> {
                    reg.setStatus(TriggerRegistrationStatus.DISABLED);
                    registrationRepository.save(reg);
                });
    }

    public Optional<TriggerRegistration> findByWorkflowDefinitionId(String workflowDefinitionId) {
        return registrationRepository.findByWorkflowDefinitionId(workflowDefinitionId);
    }

    public TriggerPollState loadOrCreateState(TriggerRegistration registration, PollConfig poll) {
        return pollStateRepository.findByRegistrationId(registration.getId())
                .orElseGet(() -> {
                    TriggerPollState state = TriggerPollState.builder()
                            .id(UUID.randomUUID().toString())
                            .registrationId(registration.getId())
                            .semantics(poll.getSemantics())
                            .baselineEstablished(false)
                            .build();
                    return pollStateRepository.save(state);
                });
    }

    public TriggerPollState saveState(TriggerPollState state) {
        return pollStateRepository.save(state);
    }

    public TriggerPollLog writePollLog(
            TriggerRegistration registration,
            long durationMs,
            int itemsFetched,
            int itemsNew,
            int itemsSkipped,
            int itemsUpdated,
            boolean triggeredExecution,
            String error) {
        return writePollLog(registration, durationMs, itemsFetched, itemsNew, itemsSkipped,
                itemsUpdated, triggeredExecution, error, false, null);
    }

    public TriggerPollLog writePollLog(
            TriggerRegistration registration,
            long durationMs,
            int itemsFetched,
            int itemsNew,
            int itemsSkipped,
            int itemsUpdated,
            boolean triggeredExecution,
            String error,
            boolean reprocess,
            java.util.List<String> reprocessedItemKeys) {
        TriggerPollLog log = TriggerPollLog.builder()
                .id(UUID.randomUUID().toString())
                .registrationId(registration.getId())
                .workflowDefinitionId(registration.getWorkflowDefinitionId())
                .polledAt(Instant.now())
                .durationMs(durationMs)
                .itemsFetched(itemsFetched)
                .itemsNew(itemsNew)
                .itemsSkipped(itemsSkipped)
                .itemsUpdated(itemsUpdated)
                .triggeredExecution(triggeredExecution)
                .error(error)
                .reprocess(reprocess)
                .reprocessedItemKeys(reprocessedItemKeys)
                .build();
        return pollLogRepository.save(log);
    }

    public void recordPollSuccess(TriggerRegistration registration) {
        registration.setLastPollAt(Instant.now());
        registration.setLastSuccessAt(Instant.now());
        registration.setConsecutiveFailures(0);
        registration.setLastErrorMessage(null);
        registration.setLastErrorAt(null);
        if (registration.getStatus() == TriggerRegistrationStatus.ERROR) {
            registration.setStatus(TriggerRegistrationStatus.ACTIVE);
        }
        registrationRepository.save(registration);
    }

    public void recordPollFailure(TriggerRegistration registration, String error) {
        registration.setLastPollAt(Instant.now());
        registration.setLastErrorAt(Instant.now());
        registration.setLastErrorMessage(error);
        int failures = registration.getConsecutiveFailures() + 1;
        registration.setConsecutiveFailures(failures);
        if (failures >= apiProperties.getPoll().getMaxConsecutiveFailures()) {
            registration.setStatus(TriggerRegistrationStatus.ERROR);
        }
        registrationRepository.save(registration);
    }

    public Page<TriggerPollLog> getPollLogs(String workflowDefinitionId, Pageable pageable) {
        if (registrationRepository.findByWorkflowDefinitionId(workflowDefinitionId).isEmpty()) {
            throw new ResourceNotFoundException("TriggerRegistration", workflowDefinitionId);
        }
        return pollLogRepository.findByWorkflowDefinitionIdOrderByPolledAtDesc(workflowDefinitionId, pageable);
    }

    private void ensurePollState(TriggerRegistration registration, PollConfig poll) {
        if (pollStateRepository.findByRegistrationId(registration.getId()).isEmpty()) {
            TriggerPollState state = TriggerPollState.builder()
                    .id(UUID.randomUUID().toString())
                    .registrationId(registration.getId())
                    .semantics(poll.getSemantics() != null ? poll.getSemantics() : PollEventSemantics.NEW_ITEMS)
                    .baselineEstablished(false)
                    .build();
            pollStateRepository.save(state);
        }
    }
}
