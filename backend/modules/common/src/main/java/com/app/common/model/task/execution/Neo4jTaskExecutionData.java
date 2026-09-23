package com.app.common.model.task.execution;

import java.util.Map;
import lombok.Data;

@Data
public class Neo4jTaskExecutionData implements TaskExecutionData {
    private Object result;
    
    @Override
    public String getTaskType() {
        return "NEO4J_TASK";
    }

    @Override
    public Map<String, Object> toOutputMap() {
        return Map.of("result", result != null ? result : Map.of());
    }
}
