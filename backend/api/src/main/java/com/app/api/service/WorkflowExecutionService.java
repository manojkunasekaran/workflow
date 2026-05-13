package com.app.api.service;

import com.app.api.dispatcher.ExecutionTriggerDispatcher;
import com.app.api.dto.HumanTaskResponse;
import com.app.common.constant.ExecutionType;
import com.app.common.entity.WorkflowExecution;
import com.app.common.entity.WorkflowTaskExecution;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.exception.ValidationException;
import com.app.common.grpc.HumanTaskResponseRequest;
import com.app.common.grpc.WorkflowServiceGrpc;
import com.app.common.model.variable.VariableValue;
import com.app.persistence.repository.WorkflowExecutionRepository;
import com.app.persistence.repository.WorkflowTaskExecutionRepository;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
public class WorkflowExecutionService {

    private final WorkflowExecutionRepository executionRepository;
    private final WorkflowTaskExecutionRepository taskExecutionRepository;
    private final WorkflowServiceGrpc.WorkflowServiceBlockingStub workflowServiceStub;
    private final ObjectMapper objectMapper;
    private final Map<ExecutionType, ExecutionTriggerDispatcher> dispatchers;

    public WorkflowExecutionService(
            WorkflowExecutionRepository executionRepository,
            WorkflowTaskExecutionRepository taskExecutionRepository,
            WorkflowServiceGrpc.WorkflowServiceBlockingStub workflowServiceStub,
            ObjectMapper objectMapper,
            List<ExecutionTriggerDispatcher> dispatcherList) {
        this.executionRepository = executionRepository;
        this.taskExecutionRepository = taskExecutionRepository;
        this.workflowServiceStub = workflowServiceStub;
        this.objectMapper = objectMapper;
        this.dispatchers = dispatcherList.stream()
                .collect(Collectors.toMap(ExecutionTriggerDispatcher::getType, Function.identity()));
    }

    /**
     * Trigger a workflow execution using the specified execution type.
     * Delegates to the appropriate {@link ExecutionTriggerDispatcher}.
     */
    public WorkflowExecution triggerExecution(String definitionId, ExecutionType type,
                                              Map<String, VariableValue> inputs) {
        ExecutionTriggerDispatcher dispatcher = dispatchers.get(type);
        if (dispatcher == null) {
            throw new ValidationException("Unsupported execution type: " + type);
        }
        return dispatcher.dispatch(definitionId, inputs);
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

    /**
     * Respond to a pending human task via gRPC call to the Core service.
     */
    public WorkflowTaskExecution respondToHumanTask(String executionId, String taskExecutionId,
                                                    HumanTaskResponse response) {
        try {
            String formDataJson = response.getFormData() != null
                    ? objectMapper.writeValueAsString(response.getFormData())
                    : "";

            HumanTaskResponseRequest request = HumanTaskResponseRequest.newBuilder()
                    .setExecutionId(executionId)
                    .setTaskExecutionId(taskExecutionId)
                    .setActionId(response.getActionId() != null ? response.getActionId() : "")
                    .setRespondedBy(response.getRespondedBy() != null ? response.getRespondedBy() : "")
                    .setFormDataJson(formDataJson)
                    .build();

            workflowServiceStub
                    .withDeadlineAfter(10, TimeUnit.SECONDS)
                    .respondToHumanTask(request);

        } catch (Exception e) {
            log.error("Error responding to human task: executionId={}, taskId={}",
                    executionId, taskExecutionId, e);
            throw new RuntimeException("Failed to respond to human task: " + e.getMessage(), e);
        }

        return taskExecutionRepository.findById(taskExecutionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "WorkflowTaskExecution", taskExecutionId));
    }
}
