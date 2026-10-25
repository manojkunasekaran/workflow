package com.app.persistence.repository;

import com.app.common.model.trigger.FormEnvironment;
import com.app.persistence.entity.FormRegistrationEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface FormRegistrationRepository extends MongoRepository<FormRegistrationEntity, String> {

    Optional<FormRegistrationEntity> findByEnvironmentAndSlug(FormEnvironment environment, String slug);

    Optional<FormRegistrationEntity> findByEnvironmentAndSlugAndActiveTrue(
            FormEnvironment environment, String slug);

    List<FormRegistrationEntity> findByWorkflowDefinitionId(String workflowDefinitionId);

    Optional<FormRegistrationEntity> findByWorkflowDefinitionIdAndEnvironment(
            String workflowDefinitionId, FormEnvironment environment);
}
