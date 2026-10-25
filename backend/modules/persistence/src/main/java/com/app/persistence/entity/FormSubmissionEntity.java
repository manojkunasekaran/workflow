package com.app.persistence.entity;

import com.app.common.constant.CollectionNames;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Data
@Document(collection = CollectionNames.FORM_SUBMISSIONS)
public class FormSubmissionEntity {
    @Id
    private String id;

    @Indexed
    private String organizationId;

    @Indexed
    private String workflowDefinitionId;

    @Indexed(unique = true)
    private String workflowExecutionId;

    private String environment;
    private List<FormStepRecord> steps = new ArrayList<>();
    private Instant createdAt;
    private Instant updatedAt;

    @Data
    public static class FormStepRecord {
        private String stepId;
        private String taskId;
        /** Legacy plain answers; new rows use encryptedAnswers only. */
        private Map<String, Object> answers;
        /** AES-GCM encrypted JSON map of answers. */
        private String encryptedAnswers;
        private Instant submittedAt;
    }
}
