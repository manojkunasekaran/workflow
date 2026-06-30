package com.app.common.model.task.execution;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import com.app.common.model.task.TaskType;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Captures complete HTTP task execution details for audit trail.
 * Stores full request/response information for debugging and replay.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HttpTaskExecutionData implements TaskExecutionData {

    private HttpRequestDetails request;
    private HttpResponseDetails response;

    @Override
    public String getTaskType() {
        return TaskType.HTTP_TASK.name();
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

    /**
     * Details of the HTTP request that was sent
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HttpRequestDetails {
        private String url;
        private String method;
        private Map<String, String> headers;
        private Object body;
        private Instant timestamp;
    }

    /**
     * Details of the HTTP response received
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HttpResponseDetails {
        private Integer statusCode;
        private String statusText;
        private Map<String, String> headers;
        private Object body;
        private Instant timestamp;
    }
}
