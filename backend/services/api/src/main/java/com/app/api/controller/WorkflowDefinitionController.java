package com.app.api.controller;

import com.app.common.entity.WorkflowDefinition;
import com.app.common.exception.ResourceNotFoundException;
import com.app.api.service.WorkflowDefinitionService;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.lang.NonNull;
import java.util.List;

@RestController
@RequestMapping("/workflows")
@RequiredArgsConstructor
public class WorkflowDefinitionController {

    private final WorkflowDefinitionService service;

    @PostMapping
    public WorkflowDefinition create(@NonNull @RequestBody WorkflowDefinition definition) {
        return service.createWorkflowDefinition(definition);
    }

    @GetMapping
    public List<WorkflowDefinition> list() {
        return service.getAllWorkflowDefinitions();
    }

    @GetMapping("/{id}")
    public WorkflowDefinition get(@NonNull @PathVariable String id) {
        return service.getWorkflowDefinitionById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowDefinition", id));
    }

    @DeleteMapping("/{id}")
    public void delete(@NonNull @PathVariable String id) {
        if (service.getWorkflowDefinitionById(id).isEmpty()) {
            throw new ResourceNotFoundException("WorkflowDefinition", id);
        }
        service.deleteWorkflowDefinition(id);
    }
}
