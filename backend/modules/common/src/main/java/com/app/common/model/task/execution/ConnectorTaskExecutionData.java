package com.app.common.model.task.execution;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.app.common.model.task.TaskType;

import java.util.HashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConnectorTaskExecutionData implements TaskExecutionData {
    private String connectorId;
    private String actionId;
    private HttpTaskExecutionData.HttpRequestDetails request;
    private HttpTaskExecutionData.HttpResponseDetails response;

    @Override
    public String getTaskType() {
        return TaskType.CONNECTOR_TASK.name();
    }

    @Override
    public Map<String, Object> toOutputMap() {
        Map<String, Object> output = new HashMap<>();
        if (response != null) {
            output.put("statusCode", response.getStatusCode());
            output.put("headers", response.getHeaders());
            output.put("body", response.getBody());
        }
        return output;
    }
}
