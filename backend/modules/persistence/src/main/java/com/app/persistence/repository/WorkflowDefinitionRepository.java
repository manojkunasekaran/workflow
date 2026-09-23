package com.app.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.app.common.entity.WorkflowDefinition;

@Repository
public interface WorkflowDefinitionRepository extends MongoRepository<WorkflowDefinition, String> {
    Optional<WorkflowDefinition> findByWorkflowIdAndLatestTrue(String workflowId);
    List<WorkflowDefinition> findAllByWorkflowIdOrderByVersionDesc(String workflowId);
}
