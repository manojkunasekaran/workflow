package com.app.core.inbound;

import com.app.common.exception.ResourceNotFoundException;
import com.app.common.exception.ValidationException;
import com.app.messaging.grpc.EmptyResponse;
import com.app.messaging.grpc.ProcessExecutionRequest;
import com.app.messaging.grpc.WorkflowServiceGrpc;
import com.app.core.service.WorkflowEngine;

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
 * Delegates processing to the {@link WorkflowEngine}.
 */
@Slf4j
@GrpcService
@RequiredArgsConstructor
public class SyncWorkflowConsumer extends WorkflowServiceGrpc.WorkflowServiceImplBase {

    private final WorkflowEngine workflowEngine;

    @Override
    public void processExecution(ProcessExecutionRequest request, StreamObserver<EmptyResponse> responseObserver) {
        log.info("Received process execution request: executionId={}", request.getExecutionId());
        try {
            workflowEngine.processExecution(request.getExecutionId());

            responseObserver.onNext(EmptyResponse.getDefaultInstance());
            responseObserver.onCompleted();

        } catch (Exception e) {
            log.error("Failed to process execution: executionId={}", request.getExecutionId(), e);
            responseObserver.onError(mapToGrpcStatus(e).asRuntimeException());
        }
    }

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
