package com.app.core.service;

import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;

import com.app.common.entity.WorkflowExecution;

import com.app.core.model.ExecutionContext;

import com.app.common.model.task.execution.TaskExecutionData;

import java.util.Collections;
import java.util.Map;

public interface TaskExecutor {
    boolean canExecute(TaskType taskType);

    TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution, ExecutionContext context);

    /**
     * Standard method to build the output map from execution data.
     * Delegates to the data object's toOutputMap() implementation.
     */
    default Map<String, Object> buildOutput(TaskExecutionData data) {
        if (data == null) {
            return Collections.emptyMap();
        }
        return data.toOutputMap();
    }
}
