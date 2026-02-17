package com.app.api.controller;

import com.app.api.dto.HumanTaskResponse;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.entity.WorkflowExecution;
import com.app.common.entity.WorkflowTaskExecution;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.exception.ValidationException;
import com.app.core.executors.HumanTaskExecutor;
import com.app.core.service.WorkflowDefinitionService;
import com.app.core.service.WorkflowEngine;
import com.app.persistence.repository.WorkflowExecutionRepository;
import com.app.persistence.repository.WorkflowTaskExecutionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/executions")
@RequiredArgsConstructor
public class WorkflowExecutionController {

    private final WorkflowEngine workflowEngine;
    private final HumanTaskExecutor humanTaskExecutor;
    private final WorkflowDefinitionService definitionService;
    private final WorkflowExecutionRepository executionRepository;
    private final WorkflowTaskExecutionRepository taskExecutionRepository;

    @PostMapping
    public ResponseEntity<WorkflowExecution> triggerExecution(@RequestBody Map<String, String> request) {
        String workflowId = request.get("workflowId");
        if (workflowId == null) {
            throw new ValidationException("workflowId is required");
        }

        WorkflowDefinition definition = definitionService.getWorkflowDefinitionById(workflowId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowDefinition", workflowId));

        WorkflowExecution execution = workflowEngine.startWorkflow(definition);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(execution);
    }

    /**
     * Get all workflow executions (most recent first)
     */
    @GetMapping
    public List<WorkflowExecution> getAllExecutions() {
        return executionRepository.findAll(Sort.by(Sort.Direction.DESC, "_id"));
    }

    /**
     * Get workflow execution by ID
     */
    @GetMapping("/{id}")
    public WorkflowExecution getExecutionById(@PathVariable String id) {
        return executionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowExecution", id));
    }

    /**
     * Get all task executions for a workflow execution
     */
    @GetMapping("/{id}/tasks")
    public List<WorkflowTaskExecution> getTaskExecutions(@PathVariable String id) {
        return taskExecutionRepository.findAllByWorkflowExecutionId(id);
    }

    /**
     * Respond to a pending human task.
     * Delegates all validation and processing to HumanTaskService.
     */
    @PostMapping("/{executionId}/tasks/{taskExecutionId}/respond")
    public ResponseEntity<WorkflowTaskExecution> respondToHumanTask(
            @PathVariable String executionId,
            @PathVariable String taskExecutionId,
            @RequestBody HumanTaskResponse response) {

        WorkflowTaskExecution updated = humanTaskExecutor.respond(
                executionId, taskExecutionId,
                response.getActionId(), response.getRespondedBy(),
                response.getFormData());

        return ResponseEntity.ok(updated);
    }
}
