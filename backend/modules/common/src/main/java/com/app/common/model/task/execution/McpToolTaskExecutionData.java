package com.app.common.model.task.execution;

import com.app.common.model.task.TaskType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class McpToolTaskExecutionData implements TaskExecutionData {

    private String remoteToolName;
    private Object result;
    private boolean isError;

    @Override
    public String getTaskType() {
        return TaskType.MCP_TOOL.name();
    }

    @Override
    public Map<String, Object> toOutputMap() {
        Map<String, Object> output = new HashMap<>();
        output.put("remoteToolName", remoteToolName);
        output.put("result", result);
        output.put("isError", isError);
        return output;
    }
}
