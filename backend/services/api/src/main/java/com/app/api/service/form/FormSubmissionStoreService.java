package com.app.api.service.form;

import com.app.common.model.form.FormPageDefinition;
import com.app.crypto.util.EncryptionService;
import com.app.persistence.entity.FormSubmissionEntity;
import com.app.persistence.repository.FormSubmissionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FormSubmissionStoreService {

    private final FormSubmissionRepository submissionRepository;
    private final EncryptionService encryptionService;
    private final ObjectMapper objectMapper;

    public FormSubmissionEntity ensureSubmission(
            String organizationId,
            String workflowDefinitionId,
            String executionId,
            String environment) {
        return submissionRepository
                .findByWorkflowExecutionId(executionId)
                .orElseGet(() -> {
                    FormSubmissionEntity entity = new FormSubmissionEntity();
                    entity.setId(UUID.randomUUID().toString());
                    entity.setOrganizationId(organizationId);
                    entity.setWorkflowDefinitionId(workflowDefinitionId);
                    entity.setWorkflowExecutionId(executionId);
                    entity.setEnvironment(environment);
                    entity.setCreatedAt(Instant.now());
                    entity.setUpdatedAt(Instant.now());
                    return submissionRepository.save(entity);
                });
    }

    public void appendStep(
            FormSubmissionEntity submission,
            String stepId,
            String taskId,
            Map<String, Object> answers) {
        FormSubmissionEntity.FormStepRecord record = new FormSubmissionEntity.FormStepRecord();
        record.setStepId(stepId);
        record.setTaskId(taskId);
        record.setAnswers(null);
        record.setEncryptedAnswers(encryptAnswers(answers));
        record.setSubmittedAt(Instant.now());
        submission.getSteps().add(record);
        submission.setUpdatedAt(Instant.now());
        submissionRepository.save(submission);
    }

    public static String stepIdForLanding() {
        return "landing";
    }

    public static String stepIdForPage(FormPageDefinition page) {
        return page.getPageId() != null && !page.getPageId().isBlank() ? page.getPageId() : "page";
    }

    public String encryptAnswers(Map<String, Object> answers) {
        if (answers == null || answers.isEmpty()) {
            return encryptionService.encrypt("{}");
        }
        try {
            return encryptionService.encrypt(objectMapper.writeValueAsString(answers));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize form answers", e);
        }
    }

    public Map<String, Object> decryptAnswers(String encrypted) {
        if (encrypted == null || encrypted.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            String json = encryptionService.decrypt(encrypted);
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to deserialize form answers", e);
        }
    }
}
