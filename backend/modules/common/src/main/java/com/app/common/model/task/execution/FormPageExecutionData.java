package com.app.common.model.task.execution;

import com.app.common.model.form.FormSchema;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
public class FormPageExecutionData implements TaskExecutionData {
    private FormSchema pageSchema;
    private Map<String, Object> answers;
    private boolean submitted;
    private Instant submittedAt;

    @Override
    public String getTaskType() {
        return "FORM_PAGE";
    }

    @Override
    public Map<String, Object> toOutputMap() {
        return answers != null ? answers : Map.of();
    }
}
