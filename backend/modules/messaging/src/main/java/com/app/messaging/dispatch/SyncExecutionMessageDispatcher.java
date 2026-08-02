package com.app.messaging.dispatch;

import com.app.common.constant.ExecutionType;
import com.app.messaging.grpc.ProcessExecutionRequest;
import com.app.messaging.grpc.WorkflowServiceGrpc;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

import com.app.messaging.config.properties.WorkflowMessagingProperties;

@Slf4j
@Component
@ConditionalOnBean(WorkflowServiceGrpc.WorkflowServiceBlockingStub.class)
@RequiredArgsConstructor
public class SyncExecutionMessageDispatcher implements ExecutionMessageDispatcher {

    private final WorkflowServiceGrpc.WorkflowServiceBlockingStub workflowServiceStub;
    private final WorkflowMessagingProperties messagingProperties;

    @Override
    public ExecutionType getType() {
        return ExecutionType.SYNC;
    }

    @Override
    public void dispatch(String executionId) {
        workflowServiceStub
                .withDeadlineAfter(messagingProperties.getExecution().getSyncTimeoutSeconds(), TimeUnit.SECONDS)
                .processExecution(ProcessExecutionRequest.newBuilder()
                        .setExecutionId(executionId)
                        .build());
        log.info("Sync message dispatch: executionId={}", executionId);
    }
}
