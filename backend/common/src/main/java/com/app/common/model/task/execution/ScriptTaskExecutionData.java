package com.app.common.model.task.execution;

import lombok.Builder;
import lombok.Data;
import java.util.Map;
import java.util.HashMap;

@Data
@Builder
public class ScriptTaskExecutionData implements TaskExecutionData {
    private String logs;
    private String language;
    private String error;
    private Object result;

    @Override
    public String getTaskType() {
        return "SCRIPT_TASK";
    }

    @Override
    public Map<String, Object> toOutputMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("result", result);
        if (error != null) {
            map.put("error", error);
        }
        if (logs != null && !logs.isEmpty()) {
            map.put("logs", logs);
        }
        return map;
    }
}
