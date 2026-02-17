package com.app.common.entity;

import com.app.common.constant.CollectionNames;
import com.app.common.model.base.Auditable;
import com.app.common.model.task.execution.TaskExecutionData;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@EqualsAndHashCode(callSuper = true)
@Document(collection = CollectionNames.WORKFLOW_TASK_EXECUTIONS)
public class WorkflowTaskExecution extends Auditable {
    @Id
    private String id;
    private String workflowExecutionId;
    private String workflowDefinitionId;
    private String taskDefinitionId;
    private String taskType;
    private String status;
    private Instant startTime;
    private Instant endTime;
    private String errorMessage;

    // Structured execution data (HttpTaskExecutionData, ScriptTaskExecutionData,
    // etc.)
    private TaskExecutionData executionData;
}
