package com.app.common.model.task.execution;

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
public class AgentsTaskExecutionData implements TaskExecutionData {

    private String modelUsed;
    private Integer promptTokens;
    private Integer completionTokens;
    private Integer totalTokens;
    private Object responseBody;
    private String generatedText;

    @Override
    public String getTaskType() {
        return com.app.common.model.task.TaskType.AGENTS_TASK.name();
    }

    @Override
    public Map<String, Object> toOutputMap() {
        Map<String, Object> output = new HashMap<>();
        output.put("generatedText", generatedText);
        output.put("model", modelUsed);
        output.put("promptTokens", promptTokens);
        output.put("completionTokens", completionTokens);
        output.put("totalTokens", totalTokens);
        output.put("rawResponse", responseBody);
        return output;
    }
}
