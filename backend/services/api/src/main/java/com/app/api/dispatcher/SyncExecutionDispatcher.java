package com.app.api.dispatcher;

import com.app.common.constant.ExecutionType;
import com.app.common.entity.WorkflowExecution;
import com.app.messaging.grpc.TriggerExecutionRequest;
import com.app.messaging.grpc.WorkflowExecutionResponse;
import com.app.messaging.grpc.WorkflowServiceGrpc;
import com.app.common.model.variable.VariableValue;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.TimeUnit;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Sync execution dispatcher — triggers execution via a synchronous remote call
 * (gRPC) and waits for the engine to accept the workflow.
 * <p>
 * To swap the remote protocol, replace the gRPC stub usage with the
 * desired client (e.g., REST, WebSocket).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SyncExecutionDispatcher implements ExecutionTriggerDispatcher {

        private final WorkflowServiceGrpc.WorkflowServiceBlockingStub workflowServiceStub;
        private final ObjectMapper objectMapper;

        @Override
        public ExecutionType getType() {
                return ExecutionType.SYNC;
        }

        @Override
        public WorkflowExecution dispatch(String definitionId, Map<String, VariableValue> inputs) {
                log.info("Dispatching sync trigger: definitionId={}", definitionId);

                TriggerExecutionRequest request = TriggerExecutionRequest.newBuilder()
                                .setWorkflowId(definitionId)
                                .build();

                WorkflowExecutionResponse response = workflowServiceStub
                                .withDeadlineAfter(30, TimeUnit.SECONDS)
                                .triggerExecution(request);

                try {
                        // Reconstruct the execution directly from the gRPC response
                        return objectMapper.readValue(response.getExecutionJson(), WorkflowExecution.class);
                } catch (Exception e) {
                        log.error("Failed to parse Sync execution response JSON for definition: {}", definitionId, e);
                        throw new IllegalStateException("Failed to parse execution response", e);
                }
        }
}
