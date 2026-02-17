package com.app.common.entity;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.app.common.constant.CollectionNames;
import com.app.common.model.base.Auditable;
import com.app.common.model.variable.VariableValue;

@Data
@EqualsAndHashCode(callSuper = true)
@Document(collection = CollectionNames.WORKFLOW_EXECUTIONS)
public class WorkflowExecution extends Auditable {
    @Id
    private String id;
    private String workflowId;
    private String workflowDefinitionId;
    private String status;
    private Instant startTime;
    private Instant endTime;
    private List<TaskExecutionSummary> taskExecutionSummaries;

    /**
     * The ID of the next task to execute when the workflow resumes.
     * Set when workflow is paused (e.g., PAUSED status due to human task).
     */
    private String currentTaskId;

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
    private Map<String, Object> taskOutputs = new HashMap<>();

    @Data
    public static class TaskExecutionSummary {
        private String taskExecutionId;
        private String taskDefinitionId;
        private String status;
    }
}
