package com.app.core.inbound;

import com.app.common.entity.WorkflowExecution;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.exception.ValidationException;
import com.app.messaging.grpc.EmptyResponse;
import com.app.messaging.grpc.HumanTaskResponseRequest;
import com.app.messaging.grpc.TriggerExecutionRequest;
import com.app.messaging.grpc.WorkflowExecutionResponse;
import com.app.messaging.grpc.WorkflowServiceGrpc;
import com.app.core.executors.HumanTaskExecutor;
import com.app.core.service.WorkflowEngine;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.service.GrpcService;

import java.util.Map;

/**
 * Synchronous inbound adapter for the workflow engine.
 * <p>
 * Exposes a gRPC endpoint for direct invocation by the API service.
 * Delegates actual execution and repository logic to the
 * {@link WorkflowEngine}.
 */
@Slf4j
@GrpcService
@RequiredArgsConstructor
public class SyncWorkflowConsumer extends WorkflowServiceGrpc.WorkflowServiceImplBase {

    private final WorkflowEngine workflowEngine;
    private final HumanTaskExecutor humanTaskExecutor;
    private final ObjectMapper objectMapper;

    @Override
    public void triggerExecution(TriggerExecutionRequest request,
            StreamObserver<WorkflowExecutionResponse> responseObserver) {
        log.info("Received sync trigger request: definitionId={}", request.getWorkflowId());

        try {
            WorkflowExecution execution = workflowEngine.triggerWorkflow(
                    request.getWorkflowId(),
                    null,
                    null);

            String executionJson = objectMapper.writeValueAsString(execution);

            WorkflowExecutionResponse response = WorkflowExecutionResponse.newBuilder()
                    .setExecutionId(execution.getId())
                    .setStatus(execution.getStatus() != null ? execution.getStatus().name() : "UNKNOWN")
                    .setExecutionJson(executionJson)
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();

        } catch (Exception e) {
            log.error("Failed to process sync trigger request: definitionId={}", request.getWorkflowId(), e);
            responseObserver.onError(mapToGrpcStatus(e).asRuntimeException());
        }
    }

    @Override
    public void respondToHumanTask(HumanTaskResponseRequest request, StreamObserver<EmptyResponse> responseObserver) {
        log.info("Received sync human task response: executionId={}, taskExecutionId={}",
                request.getExecutionId(), request.getTaskExecutionId());
        try {
            Map<String, Object> formData = null;
            if (!request.getFormDataJson().isEmpty()) {
                formData = objectMapper.readValue(
                        request.getFormDataJson(), new TypeReference<>() {
                        });
            }

            humanTaskExecutor.respond(
                    request.getExecutionId(),
                    request.getTaskExecutionId(),
                    request.getActionId(),
                    request.getRespondedBy(),
                    formData);

            responseObserver.onNext(EmptyResponse.getDefaultInstance());
            responseObserver.onCompleted();

        } catch (Exception e) {
            log.error("Failed to process human task response: executionId={}, taskExecutionId={}",
                    request.getExecutionId(), request.getTaskExecutionId(), e);
            responseObserver.onError(mapToGrpcStatus(e).asRuntimeException());
        }
    }

    /**
     * Maps domain exceptions to semantically correct gRPC status codes.
     */
    private Status mapToGrpcStatus(Exception e) {
        if (e instanceof ResourceNotFoundException) {
            return Status.NOT_FOUND.withDescription(e.getMessage());
        }
        if (e instanceof ValidationException || e instanceof IllegalArgumentException) {
            return Status.INVALID_ARGUMENT.withDescription(e.getMessage());
        }
        if (e instanceof IllegalStateException) {
            return Status.FAILED_PRECONDITION.withDescription(e.getMessage());
        }
        return Status.INTERNAL.withDescription("Internal server error");
    }
}
