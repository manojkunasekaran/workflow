package com.app.api.service.form;

import com.app.api.dto.form.FormSubmissionDto;
import com.app.persistence.entity.FormSubmissionEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FormSubmissionQueryService {

    private final FormSubmissionStoreService submissionStoreService;

    public FormSubmissionDto toDto(FormSubmissionEntity entity) {
        List<FormSubmissionDto.FormStepDto> steps = entity.getSteps().stream()
                .map(this::toStepDto)
                .collect(Collectors.toList());
        return FormSubmissionDto.builder()
                .id(entity.getId())
                .workflowDefinitionId(entity.getWorkflowDefinitionId())
                .workflowExecutionId(entity.getWorkflowExecutionId())
                .environment(entity.getEnvironment())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .steps(steps)
                .build();
    }

    public Page<FormSubmissionDto> mapPage(Page<FormSubmissionEntity> page) {
        return page.map(this::toDto);
    }

    private FormSubmissionDto.FormStepDto toStepDto(FormSubmissionEntity.FormStepRecord record) {
        Map<String, Object> answers = record.getAnswers();
        if (record.getEncryptedAnswers() != null && !record.getEncryptedAnswers().isBlank()) {
            answers = submissionStoreService.decryptAnswers(record.getEncryptedAnswers());
        }
        return FormSubmissionDto.FormStepDto.builder()
                .stepId(record.getStepId())
                .taskId(record.getTaskId())
                .answers(answers)
                .submittedAt(record.getSubmittedAt())
                .build();
    }
}
