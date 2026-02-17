package com.app.core.service;

import com.app.common.entity.WorkflowDefinition;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class WorkflowDefinitionService {

    private final WorkflowDefinitionRepository repository;

    public WorkflowDefinition createWorkflowDefinition(@NonNull WorkflowDefinition definition) {
        // Custom logic can be added here before saving
        return repository.save(definition);
    }

    public List<WorkflowDefinition> getAllWorkflowDefinitions() {
        return repository.findAll();
    }

    public Optional<WorkflowDefinition> getWorkflowDefinitionById(@NonNull String id) {
        return repository.findById(id);
    }

    public void deleteWorkflowDefinition(@NonNull String id) {
        repository.deleteById(id);
    }
}
