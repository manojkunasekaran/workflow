package com.app.api.service.webhook;

import com.app.common.entity.TriggerRegistration;
import com.app.common.entity.WorkflowDefinition;

/**
 * Outbound subscribe/unsubscribe lifecycle for webhook triggers in subscribe delivery mode.
 * Implemented in Phase C.
 */
public interface WebhookSubscribeLifecycle {

    void onSync(WorkflowDefinition definition, TriggerRegistration registration);

    void onDeactivate(TriggerRegistration registration);
}
