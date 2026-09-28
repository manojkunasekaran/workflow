package com.app.api.service;

import com.app.api.service.webhook.WebhookRegistrationService;
import com.app.common.entity.WorkflowDefinition;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Delegates trigger activation to the appropriate runtime services.
 * Schedule triggers use {@link WorkflowSchedulerService#syncSchedule};
 * poll triggers use {@link WorkflowSchedulerService#syncPollTrigger};
 * webhook triggers use {@link WebhookRegistrationService}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TriggerActivationServiceImpl implements TriggerActivationService {

    private final WorkflowSchedulerService schedulerService;
    private final WebhookRegistrationService webhookRegistrationService;

    @Override
    public void sync(WorkflowDefinition definition) {
        schedulerService.syncSchedule(definition);
        schedulerService.syncPollTrigger(definition);
        webhookRegistrationService.sync(definition);
    }

    @Override
    public void deactivate(String definitionId) {
        schedulerService.cancelSchedule(definitionId);
        schedulerService.cancelPollTrigger(definitionId);
        webhookRegistrationService.deactivate(definitionId);
        log.debug("Deactivated triggers for workflow definition {}", definitionId);
    }
}
