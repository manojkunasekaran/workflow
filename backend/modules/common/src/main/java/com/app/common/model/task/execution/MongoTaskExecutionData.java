package com.app.common.model.task.execution;

import java.util.Map;
import lombok.Data;

@Data
public class MongoTaskExecutionData implements TaskExecutionData {
    private Object result;
    
    @Override
    public String getTaskType() {
        return "MONGO_TASK";
    }

    @Override
    public Map<String, Object> toOutputMap() {
        return Map.of("result", result != null ? result : Map.of());
    }
}
