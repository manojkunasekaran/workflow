package com.app.api.dto.form;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class FormSubmissionDto {
    private String id;
    private String workflowDefinitionId;
    private String workflowExecutionId;
    private String environment;
    private Instant createdAt;
    private Instant updatedAt;
    private List<FormStepDto> steps;

    @Data
    @Builder
    public static class FormStepDto {
        private String stepId;
        private String taskId;
        private Map<String, Object> answers;
        private Instant submittedAt;
    }
}
