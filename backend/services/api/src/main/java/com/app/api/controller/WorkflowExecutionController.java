package com.app.api.controller;

import com.app.api.dto.HumanTaskResponse;
import com.app.api.service.ExecutionStreamService;
import com.app.api.service.WorkflowExecutionService;
import com.app.common.constant.ExecutionType;
import com.app.common.entity.WorkflowExecution;
import com.app.common.entity.WorkflowTaskExecution;
import com.app.common.model.variable.VariableValue;
import com.app.execution.events.ExecutionEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/executions")
@RequiredArgsConstructor
public class WorkflowExecutionController {

    private final WorkflowExecutionService executionService;
    private final ExecutionStreamService streamService;

    /**
     * Trigger a workflow execution.
     *
     * @param definitionId  the workflow definition ID
     * @param executionType SYNC blocks until complete; ASYNC returns immediately (default)
     * @param payload       optional trigger inputs for variable resolution
     */
    @PostMapping("/{definitionId}")
    public ResponseEntity<WorkflowExecution> trigger(
            @PathVariable String definitionId,
            @RequestParam(required = false, defaultValue = "ASYNC") ExecutionType executionType,
            @RequestBody(required = false) Map<String, VariableValue> payload) {
        WorkflowExecution execution = executionService.triggerExecution(
                definitionId, payload, executionType);
        if (execution.getExecutionType() == ExecutionType.ASYNC) {
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(execution);
        }
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
     * Stream live execution updates (SSE).
     */
    @GetMapping(value = "/{id}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@PathVariable String id) {
        SseEmitter emitter = streamService.subscribe(id);

        WorkflowExecution execution = executionService.getExecutionById(id);
        if (execution.getStatus() != null) {
            try {
                streamService.sendSnapshot(emitter, ExecutionEvent.of(
                        execution.getId(),
                        execution.getStatus().name(),
                        execution.getCurrentTaskId()));
            } catch (Exception ignored) {
                // Client may still receive live events
            }
        }

        return emitter;
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
