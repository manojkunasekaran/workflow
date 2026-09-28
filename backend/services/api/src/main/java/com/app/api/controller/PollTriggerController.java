package com.app.api.controller;

import com.app.api.dto.PollReprocessRequest;
import com.app.api.dto.PollReprocessResult;
import com.app.api.dto.PollStateResponse;
import com.app.api.dto.PollTestResult;
import com.app.api.service.poll.PollExecutionService;
import com.app.common.entity.TriggerPollLog;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.exception.ValidationException;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Poll trigger test and state endpoints.
 */
@RestController
@RequestMapping("/workflows/{id}/trigger/poll")
@RequiredArgsConstructor
public class PollTriggerController {

    private final WorkflowDefinitionRepository definitionRepository;
    private final PollExecutionService pollExecutionService;

    @PostMapping("/test")
    public ResponseEntity<PollTestResult> testPoll(@PathVariable("id") String workflowId) {
        WorkflowDefinition definition = definitionRepository.findById(workflowId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowDefinition", workflowId));
        validatePollTrigger(definition);

        PollTestResult result = pollExecutionService.testPoll(workflowId);
        return ResponseEntity.status(HttpStatus.OK).body(result);
    }

    @GetMapping("/state")
    public PollStateResponse getPollState(@PathVariable("id") String workflowId) {
        WorkflowDefinition definition = definitionRepository.findById(workflowId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowDefinition", workflowId));
        validatePollTrigger(definition);

        return pollExecutionService.getPollState(workflowId);
    }

    @PostMapping("/reprocess")
    public PollReprocessResult reprocessPoll(
            @PathVariable("id") String workflowId,
            @RequestBody PollReprocessRequest request) {
        WorkflowDefinition definition = definitionRepository.findById(workflowId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowDefinition", workflowId));
        validatePollTrigger(definition);

        return pollExecutionService.reprocessItems(workflowId, request);
    }

    @GetMapping("/logs")
    public Page<TriggerPollLog> getPollLogs(
            @PathVariable("id") String workflowId,
            @PageableDefault(size = 20, sort = "polledAt", direction = Sort.Direction.DESC) Pageable pageable) {
        WorkflowDefinition definition = definitionRepository.findById(workflowId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowDefinition", workflowId));
        validatePollTrigger(definition);

        return pollExecutionService.getPollLogs(workflowId, pageable);
    }

    private void validatePollTrigger(WorkflowDefinition definition) {
        TriggerConfig trigger = definition.getTrigger();
        if (trigger == null || trigger.getType() != TriggerType.POLL || trigger.getPoll() == null) {
            throw new ValidationException(
                    "Workflow '" + definition.getName() + "' does not have a POLL trigger configured.");
        }
    }
}
