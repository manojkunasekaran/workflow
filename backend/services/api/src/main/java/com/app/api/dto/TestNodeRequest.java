package com.app.api.dto;

import com.app.common.entity.WorkflowDefinition;
import lombok.Data;
import java.util.Map;

@Data
public class TestNodeRequest {
    private String targetTaskId;
    private WorkflowDefinition draftDefinition;
    private Map<String, Object> cachedSampleData;
}
