package com.app.common.entity;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import com.app.common.constant.CollectionNames;
import com.app.common.constant.ExecutionType;
import com.app.common.constant.TaskExecutionStatus;
import com.app.common.constant.WorkflowExecutionStatus;
import com.app.common.model.base.Auditable;
import com.app.common.model.trigger.TriggerType;
import com.app.common.model.variable.VariableValue;

@Data
@EqualsAndHashCode(callSuper = true)
@Document(collection = CollectionNames.WORKFLOW_EXECUTIONS)
public class WorkflowExecution extends Auditable {
    @Id
    private String id;
    private String workflowId;
    private String workflowDefinitionId;
    private ExecutionType executionType;
    private WorkflowExecutionStatus status;

    /** How this execution was triggered. Null or MANUAL for legacy executions. */
    private TriggerType triggeredBy;
    private Instant startTime;
    private Instant endTime;
    private List<TaskExecutionSummary> taskExecutionSummaries;

    /**
     * The task the workflow is on right now (running or paused on).
     */
    private String currentTaskId;

    /**
     * Resolved next task when known but not started yet (e.g. after wait pause).
     * Null while the current task is still in progress.
     */
    private String nextTaskId;

    /**
     * Trigger inputs provided when the workflow execution was started.
     * Used by VariableResolver to resolve $input.fieldName expressions.
     * Key: input name, Value: typed variable value
     */
    private Map<String, VariableValue> triggerInputs = new HashMap<>();

    /**
     * Outputs from executed tasks, keyed by taskId.
     * Used by conditional tasks to reference previous task results.
     * Example: {"task_1": {"statusCode": 200, "body": {...}}}
     */
    private Map<String, Object> taskOutputs = new ConcurrentHashMap<>();

    @Data
    public static class TaskExecutionSummary {
        private String taskExecutionId;
        private String taskDefinitionId;
        private TaskExecutionStatus status;
    }
}
