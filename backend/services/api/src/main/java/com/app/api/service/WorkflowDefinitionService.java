package com.app.api.service;

import com.app.api.validation.WorkflowDefinitionValidator;
import com.app.common.entity.WorkflowDefinition;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import com.app.common.entity.WorkflowExecution;
import com.app.common.constant.ExecutionType;
import com.app.persistence.repository.WorkflowExecutionRepository;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowDefinitionService {

    private final WorkflowDefinitionRepository repository;
    private final WorkflowDefinitionValidator validator;
    private final WorkflowSchedulerService schedulerService;
    private final WorkflowExecutionService executionService;
    private final WorkflowExecutionRepository executionRepository;

    public WorkflowDefinition createWorkflowDefinition(@NonNull WorkflowDefinition definition) {
        validator.validate(definition);
        if (definition.getId() == null) {
            definition.setId(UUID.randomUUID().toString());
        }
        WorkflowDefinition saved = repository.save(definition);

        // Sync schedule: register cron if SCHEDULE trigger is active, cancel otherwise
        schedulerService.syncSchedule(saved);

        return saved;
    }

    public List<WorkflowDefinition> getAllWorkflowDefinitions() {
        return repository.findAll();
    }

    public Optional<WorkflowDefinition> getWorkflowDefinitionById(@NonNull String id) {
        return repository.findById(id);
    }

    public void deleteWorkflowDefinition(@NonNull String id) {
        schedulerService.cancelSchedule(id);
        repository.deleteById(id);
    }

    public com.app.api.dto.TestNodeResponse testNode(com.app.api.dto.TestNodeRequest request) {
        // 1. Save temporary draft workflow
        WorkflowDefinition draft = request.getDraftDefinition();
        draft.setId("draft_" + UUID.randomUUID().toString());
        // Skip schedule sync and deep validation for drafts
        repository.save(draft);

        try {
            // 2. Trigger test execution
            WorkflowExecution result = executionService.triggerTestExecution(
                draft.getId(), 
                request.getTargetTaskId(), 
                request.getCachedSampleData()
            );

            // 3. Return outputs
            com.app.api.dto.TestNodeResponse response = new com.app.api.dto.TestNodeResponse();
            response.setNewSampleData(result.getTaskOutputs());
            
            if (com.app.common.constant.WorkflowExecutionStatus.FAILED.equals(result.getStatus())) {
                response.setSuccess(false);
                response.setError("Execution failed."); // Fallback
                
                // Find which task failed
                List<com.app.common.entity.WorkflowTaskExecution> taskExecutions = executionService.getTaskExecutions(result.getId());
                for (com.app.common.entity.WorkflowTaskExecution te : taskExecutions) {
                    if (com.app.common.constant.TaskExecutionStatus.FAILED.equals(te.getStatus())) {
                        response.setFailedTaskId(te.getTaskDefinitionId());
                        if (te.getErrorMessage() != null) {
                            response.setError(te.getErrorMessage());
                        }
                        break;
                    }
                }
            } else {
                response.setSuccess(true);
                if (result.getTaskOutputs() != null) {
                    response.setTargetResult(result.getTaskOutputs().get(request.getTargetTaskId()));
                }
            }
            return response;
        } finally {
            // 4. Cleanup temporary draft
            repository.deleteById(draft.getId());
        }
    }
}
