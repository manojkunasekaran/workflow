package com.app.api.service;

import com.app.common.entity.WorkflowDefinition;

/**
 * Central entry point for synchronizing trigger runtime state when workflow
 * definitions are created, updated, or deleted.
 */
public interface TriggerActivationService {

    /**
     * Register or update runtime trigger state for a saved workflow definition.
     * Called from {@link WorkflowDefinitionService#createWorkflowDefinition} and
     * {@link WorkflowDefinitionService#updateWorkflowDefinition}.
     */
    void sync(WorkflowDefinition definition);

    /**
     * Tear down all runtime trigger state for the given definition ID.
     * Called before workflow definition deletion.
     */
    void deactivate(String definitionId);
}
