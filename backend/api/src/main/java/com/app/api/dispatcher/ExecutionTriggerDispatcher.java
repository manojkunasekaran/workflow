package com.app.api.dispatcher;

import com.app.common.constant.ExecutionType;
import com.app.common.entity.WorkflowExecution;
import com.app.common.model.variable.VariableValue;

import java.util.Map;

/**
 * Root dispatcher interface for triggering workflow executions.
 * <p>
 * Implementations encapsulate the full trigger logic for each execution mode,
 * including transport (queue, remote call) and execution record creation.
 * New modes are added by implementing this interface — no changes to
 * existing code (Open/Closed Principle).
 */
public interface ExecutionTriggerDispatcher {

    /**
     * @return the execution type this dispatcher handles.
     */
    ExecutionType getType();

    /**
     * Dispatch a workflow execution trigger.
     *
     * @param definitionId the workflow definition to execute
     * @param inputs       optional trigger inputs for variable resolution
     * @return the created {@link WorkflowExecution} record
     */
    WorkflowExecution dispatch(String definitionId, Map<String, VariableValue> inputs);
}
