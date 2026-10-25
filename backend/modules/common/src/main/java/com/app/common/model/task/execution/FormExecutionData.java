package com.app.common.model.task.execution;

import com.app.common.model.form.FormSchema;
import com.app.common.model.task.parameters.FormTaskParameters;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FormExecutionData implements TaskExecutionData {

    private FormSchema pageSchema;
    private boolean submitted;
    private Instant submittedAt;
    private Map<String, Object> answers;
    private FormTaskParameters.EndType endType;
    private String message;
    private String redirectUrl;
    private String customHtml;

    @Override
    public String getTaskType() {
        return "FORM";
    }

    @Override
    public Map<String, Object> toOutputMap() {
        Map<String, Object> map = new HashMap<>();
        if (answers != null) {
            map.putAll(answers);
        }
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
