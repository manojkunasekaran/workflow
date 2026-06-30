package com.app.persistence.repository;

import com.app.common.entity.WorkflowTaskExecution;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WorkflowTaskExecutionRepository extends MongoRepository<WorkflowTaskExecution, String> {
    List<WorkflowTaskExecution> findAllByWorkflowExecutionId(String workflowExecutionId);
}
