package com.app.persistence.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.app.common.entity.WorkflowExecution;

@Repository
public interface WorkflowExecutionRepository extends MongoRepository<WorkflowExecution, String> {
}

