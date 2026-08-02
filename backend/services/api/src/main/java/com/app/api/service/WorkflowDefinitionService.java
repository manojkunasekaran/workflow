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

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowDefinitionService {

    private final WorkflowDefinitionRepository repository;
    private final WorkflowDefinitionValidator validator;
    private final WorkflowSchedulerService schedulerService;

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
}
