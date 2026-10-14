package com.app.common.model.task.execution;

import com.app.common.model.task.parameters.FormEndTaskParameters;
import lombok.Builder;
import lombok.Data;

import java.util.HashMap;
import java.util.Map;

@Data
@Builder
public class FormEndExecutionData implements TaskExecutionData {
    private FormEndTaskParameters.EndType endType;
    private String message;
    private String redirectUrl;
    private String customHtml;

    @Override
    public String getTaskType() {
        return "FORM_END";
    }

    @Override
    public Map<String, Object> toOutputMap() {
        Map<String, Object> map = new HashMap<>();
        if (endType != null) {
            map.put("formEndType", endType.name());
        }
        if (message != null) {
            map.put("message", message);
        }
        if (redirectUrl != null) {
            map.put("redirectUrl", redirectUrl);
        }
        return map;
    }
}
