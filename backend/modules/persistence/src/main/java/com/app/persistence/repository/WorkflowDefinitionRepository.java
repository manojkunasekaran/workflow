package com.app.persistence.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.app.common.entity.WorkflowDefinition;

@Repository
public interface WorkflowDefinitionRepository extends MongoRepository<WorkflowDefinition, String> {
    java.util.List<WorkflowDefinition> findByIntegrationId(String integrationId);
}
