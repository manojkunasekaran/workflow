package com.app.common.model.task;

import com.app.common.model.task.parameters.TaskParameters;
import lombok.Data;

@Data
public class WorkflowTask {
    private String taskId;
    private TaskType type;
    private TaskParameters parameters;
    private Boolean isTool;
}
