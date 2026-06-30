package com.app.common.model.task.execution;

import com.app.common.model.task.TaskType;
import lombok.Builder;
import lombok.Data;
import java.util.Map;

/**
 * Audit trail payload capturing the execution details of a DATA_TRANSFORM task.
 */
@Data
@Builder
public class DataTransformExecutionData implements TaskExecutionData {

    private String operation;
    private String expression;
    private Object result;
    private String error;

    @Override
    public String getTaskType() {
        return TaskType.DATA_TRANSFORM.name();
    }

    @Override
    public Map<String, Object> toOutputMap() {
        if (error != null) {
            return Map.of("error", error);
        }
        return Map.of("result", result != null ? result : Map.of());
    }
}
