package com.app.persistence.repository;

import com.app.persistence.entity.FormSubmissionEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface FormSubmissionRepository extends MongoRepository<FormSubmissionEntity, String> {

    Optional<FormSubmissionEntity> findByWorkflowExecutionId(String workflowExecutionId);

    Page<FormSubmissionEntity> findByOrganizationIdAndWorkflowDefinitionId(
            String organizationId, String workflowDefinitionId, Pageable pageable);

    Page<FormSubmissionEntity> findByOrganizationId(String organizationId, Pageable pageable);
}
