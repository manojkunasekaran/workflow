package com.app.api.service;

import com.app.api.validation.WorkflowDefinitionValidator;
import com.app.common.entity.WorkflowDefinition;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkflowDefinitionService {

    private final WorkflowDefinitionRepository repository;
    private final WorkflowDefinitionValidator validator;

    public WorkflowDefinition createWorkflowDefinition(@NonNull WorkflowDefinition definition) {
        validator.validate(definition);
        if (definition.getId() == null) {
            definition.setId(UUID.randomUUID().toString());
        }
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
