package com.app.persistence.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.app.common.entity.WorkflowExecution;

import java.util.Optional;

@Repository
public interface WorkflowExecutionRepository extends MongoRepository<WorkflowExecution, String> {

    /**
     * Find the most recently created execution for a given workflow definition.
     */
    Optional<WorkflowExecution> findTopByWorkflowDefinitionIdOrderByCreatedAtDesc(String workflowDefinitionId);
}

