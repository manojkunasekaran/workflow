package com.app.api.service;

import com.app.api.dto.HumanTaskResponse;
import com.app.common.constant.ExecutionType;
import com.app.common.constant.WorkflowExecutionStatus;
import com.app.common.entity.WorkflowExecution;
import com.app.common.entity.WorkflowTaskExecution;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.exception.ValidationException;
import com.app.common.model.trigger.TriggerType;
import com.app.common.model.variable.VariableValue;
import com.app.messaging.dispatch.ExecutionMessageDispatcherRegistry;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import com.app.persistence.repository.WorkflowExecutionRepository;
import com.app.persistence.repository.WorkflowTaskExecutionRepository;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import com.app.api.config.properties.WorkflowApiProperties;

@Slf4j
@Service
public class WorkflowExecutionService {

    private final WorkflowExecutionRepository executionRepository;
    private final WorkflowDefinitionRepository definitionRepository;
    private final WorkflowTaskExecutionRepository taskExecutionRepository;
    private final ExecutionMessageDispatcherRegistry messageDispatcherRegistry;
    private final ExecutionSyncWaiter syncWaiter;
    private final HumanTaskResponseService humanTaskResponseService;
    private final WorkflowApiProperties properties;

    public WorkflowExecutionService(
            WorkflowExecutionRepository executionRepository,
            WorkflowDefinitionRepository definitionRepository,
            WorkflowTaskExecutionRepository taskExecutionRepository,
            ExecutionMessageDispatcherRegistry messageDispatcherRegistry,
            ExecutionSyncWaiter syncWaiter,
            HumanTaskResponseService humanTaskResponseService,
            WorkflowApiProperties properties) {
        this.executionRepository = executionRepository;
        this.definitionRepository = definitionRepository;
        this.taskExecutionRepository = taskExecutionRepository;
        this.messageDispatcherRegistry = messageDispatcherRegistry;
        this.syncWaiter = syncWaiter;
        this.humanTaskResponseService = humanTaskResponseService;
        this.properties = properties;
    }

    /**
     * Trigger a workflow execution.
     * Overload for backward compatibility — defaults triggeredBy to MANUAL.
     */
    public WorkflowExecution triggerExecution(
            String definitionId, Map<String, VariableValue> inputs, ExecutionType executionType) {
        return triggerExecution(definitionId, inputs, executionType, TriggerType.MANUAL);
    }

    /**
     * Trigger a workflow execution with an explicit trigger source.
     * This is the single entry-point used by the API controller, webhook controller,
     * and scheduler service — no duplicate trigger logic.
     */
    public WorkflowExecution triggerExecution(
            String definitionId, Map<String, VariableValue> inputs,
            ExecutionType executionType, TriggerType triggeredBy) {
        var definition = definitionRepository.findById(definitionId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowDefinition", definitionId));

        WorkflowExecution execution = createQueuedExecution(
                definition, executionType, inputs, triggeredBy);
        String executionId = execution.getId();

        if (executionType == ExecutionType.SYNC) {
            ExecutionSyncWaiter.WaitSession waitSession = syncWaiter.beginWait(executionId);
            messageDispatcherRegistry.dispatch(executionType, executionId);
            return syncWaiter.await(waitSession, properties.getExecution().getSyncTimeoutSeconds(), TimeUnit.SECONDS);
        }

        messageDispatcherRegistry.dispatch(executionType, executionId);
        return execution;
    }

    public WorkflowExecution triggerTestExecution(String definitionId, String targetTaskId, Map<String, Object> cachedSampleData) {
        WorkflowExecution execution = new WorkflowExecution();
        execution.setWorkflowId(definitionId);
        execution.setWorkflowDefinitionId(definitionId);
        execution.setExecutionType(ExecutionType.SYNC);
        execution.setTargetTaskId(targetTaskId);
        execution.setTriggeredBy(TriggerType.MANUAL);
        execution.setStatus(WorkflowExecutionStatus.QUEUED);
        execution.setStartTime(Instant.now());
        execution.setTaskExecutionSummaries(java.util.Collections.synchronizedList(new ArrayList<>()));

        if (cachedSampleData != null) {
            execution.setTaskOutputs(new java.util.concurrent.ConcurrentHashMap<>(cachedSampleData));
        }

        execution = executionRepository.save(execution);
        String executionId = execution.getId();

        ExecutionSyncWaiter.WaitSession waitSession = syncWaiter.beginWait(executionId);
        messageDispatcherRegistry.dispatch(ExecutionType.SYNC, executionId);
        return syncWaiter.await(waitSession, properties.getExecution().getSyncTimeoutSeconds(), TimeUnit.SECONDS);
    }

    private WorkflowExecution createQueuedExecution(
            com.app.common.entity.WorkflowDefinition definition, ExecutionType executionType,
            Map<String, VariableValue> inputs, TriggerType triggeredBy) {
        String definitionId = definition.getId();
        WorkflowExecution execution = new WorkflowExecution();
        execution.setWorkflowId(definitionId);
        execution.setWorkflowDefinitionId(definitionId);
        execution.setExecutionType(executionType);
        execution.setTriggeredBy(triggeredBy != null ? triggeredBy : TriggerType.MANUAL);
        execution.setStatus(WorkflowExecutionStatus.QUEUED);
        execution.setStartTime(Instant.now());
        execution.setTaskExecutionSummaries(Collections.synchronizedList(new ArrayList<>()));

        if (inputs != null) {
            execution.setTriggerInputs(inputs);
        }

        return executionRepository.save(execution);
    }

    public Page<WorkflowExecution> getAllExecutions(Pageable pageable) {
        return executionRepository.findAll(pageable);
    }

    public WorkflowExecution getExecutionById(String id) {
        return executionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowExecution", id));
    }

    public List<WorkflowTaskExecution> getTaskExecutions(String id) {
        return taskExecutionRepository.findAllByWorkflowExecutionId(id);
    }

    public WorkflowTaskExecution respondToHumanTask(String executionId, String taskExecutionId,
                                                    HumanTaskResponse response) {
        WorkflowExecution execution = executionRepository.findById(executionId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowExecution", executionId));

        WorkflowTaskExecution taskExecution = humanTaskResponseService.recordResponse(
                executionId,
                taskExecutionId,
                response.getActionId(),
                response.getRespondedBy(),
                response.getFormData());

        if (!humanTaskResponseService.isTerminalOutcome(taskExecution)) {
            return taskExecution;
        }

        if (!WorkflowExecutionStatus.PAUSED.equals(execution.getStatus())) {
            throw new ValidationException(
                    "Execution is not PAUSED, current: " + execution.getStatus());
        }
        if (!taskExecution.getTaskDefinitionId().equals(execution.getCurrentTaskId())) {
            throw new ValidationException("Task does not match the execution's current task");
        }

        execution.setStatus(WorkflowExecutionStatus.QUEUED);
        execution.setEndTime(null);
        executionRepository.save(execution);

        messageDispatcherRegistry.dispatch(execution.getExecutionType(), executionId);

        log.info("Human task response dispatched: executionId={}, taskExecutionId={}, mode={}",
                executionId, taskExecutionId, execution.getExecutionType());

        return taskExecutionRepository.findById(taskExecutionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "WorkflowTaskExecution", taskExecutionId));
    }
}
