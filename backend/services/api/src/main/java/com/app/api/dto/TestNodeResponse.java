package com.app.api.dto;

import lombok.Data;
import java.util.Map;

@Data
public class TestNodeResponse {
    private boolean success;
    private String error;
    private String failedTaskId;
    private Object targetResult;
    private Map<String, Object> newSampleData;
}
