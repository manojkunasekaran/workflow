package com.app.api.controller;

import com.app.api.dto.HumanTaskResponse;
import com.app.api.service.WorkflowExecutionService;
import com.app.common.constant.ExecutionType;
import com.app.common.entity.WorkflowExecution;
import com.app.common.entity.WorkflowTaskExecution;
import com.app.common.model.variable.VariableValue;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/executions")
@RequiredArgsConstructor
public class WorkflowExecutionController {

    private final WorkflowExecutionService executionService;

    /**
     * Trigger an asynchronous workflow execution.
     * The execution is queued and processed in the background.
     *
     * @param definitionId the workflow definition ID
     * @param payload      optional trigger inputs
     * @return the created execution with status QUEUED
     */
    @PostMapping("/{definitionId}")
    public ResponseEntity<WorkflowExecution> triggerAsync(
            @PathVariable String definitionId,
            @RequestBody(required = false) Map<String, VariableValue> payload) {
        WorkflowExecution execution = executionService.triggerExecution(
                definitionId, ExecutionType.ASYNC, payload);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(execution);
    }

    /**
     * Trigger a synchronous workflow execution.
     * The call blocks until the engine accepts the execution.
     *
     * @param definitionId the workflow definition ID
     * @param payload      optional trigger inputs
     * @return the created execution with status RUNNING
     */
    @PostMapping("/{definitionId}/sync")
    public ResponseEntity<WorkflowExecution> triggerSync(
            @PathVariable String definitionId,
            @RequestBody(required = false) Map<String, VariableValue> payload) {
        WorkflowExecution execution = executionService.triggerExecution(
                definitionId, ExecutionType.SYNC, payload);
        return ResponseEntity.ok(execution);
    }

    /**
     * Get all workflow executions (paginated, most recent first).
     */
    @GetMapping
    public Page<WorkflowExecution> getAllExecutions(
            @PageableDefault(sort = "_id", direction = Sort.Direction.DESC) Pageable pageable) {
        return executionService.getAllExecutions(pageable);
    }

    /**
     * Get workflow execution by ID.
     */
    @GetMapping("/{id}")
    public WorkflowExecution getExecutionById(@PathVariable String id) {
        return executionService.getExecutionById(id);
    }

    /**
     * Get all task executions for a workflow execution.
     */
    @GetMapping("/{id}/tasks")
    public List<WorkflowTaskExecution> getTaskExecutions(@PathVariable String id) {
        return executionService.getTaskExecutions(id);
    }

    /**
     * Respond to a pending human task.
     */
    @PostMapping("/{executionId}/tasks/{taskExecutionId}/respond")
    public ResponseEntity<WorkflowTaskExecution> respondToHumanTask(
            @PathVariable String executionId,
            @PathVariable String taskExecutionId,
            @RequestBody HumanTaskResponse response) {
        WorkflowTaskExecution updated = executionService.respondToHumanTask(
                executionId, taskExecutionId, response);
        return ResponseEntity.ok(updated);
    }
}
