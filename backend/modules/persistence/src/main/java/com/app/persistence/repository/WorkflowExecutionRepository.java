package com.app.persistence.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.app.common.constant.WorkflowExecutionStatus;
import com.app.common.entity.WorkflowExecution;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorkflowExecutionRepository extends MongoRepository<WorkflowExecution, String> {

    long countByWorkflowDefinitionIdInAndTargetTaskIdIsNull(Collection<String> workflowDefinitionIds);

    long countByWorkflowDefinitionIdInAndTargetTaskIdIsNullAndStatus(
            Collection<String> workflowDefinitionIds,
            WorkflowExecutionStatus status);

    long countByWorkflowDefinitionIdAndTargetTaskIdIsNull(String workflowDefinitionId);

    long countByWorkflowDefinitionIdAndTargetTaskIdIsNullAndStatus(
            String workflowDefinitionId,
            WorkflowExecutionStatus status);

    Optional<WorkflowExecution> findFirstByWorkflowDefinitionIdInAndTargetTaskIdIsNullOrderByStartTimeDesc(
            Collection<String> workflowDefinitionIds);

    Optional<WorkflowExecution> findFirstByWorkflowDefinitionIdAndTargetTaskIdIsNullOrderByStartTimeDesc(
            String workflowDefinitionId);

    List<WorkflowExecution> findTop10ByWorkflowDefinitionIdAndTargetTaskIdIsNullOrderByStartTimeDesc(
            String workflowDefinitionId);

    Page<WorkflowExecution> findByWorkflowDefinitionIdInAndTargetTaskIdIsNullAndStatus(
            Collection<String> workflowDefinitionIds,
            WorkflowExecutionStatus status,
            Pageable pageable);

    Page<WorkflowExecution> findByWorkflowDefinitionIdAndTargetTaskIdIsNullAndStatus(
            String workflowDefinitionId,
            WorkflowExecutionStatus status,
            Pageable pageable);
}

