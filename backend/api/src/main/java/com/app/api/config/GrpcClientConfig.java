package com.app.api.config;

import com.app.common.grpc.WorkflowServiceGrpc;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;

/**
 * Centralizes gRPC client stub creation so controllers can use
 * standard constructor injection instead of field-level @GrpcClient.
 */
@Configuration
public class GrpcClientConfig {

    @Lazy
    @GrpcClient("core-service")
    private WorkflowServiceGrpc.WorkflowServiceBlockingStub workflowServiceStub;

    @Bean
    @Lazy
    public WorkflowServiceGrpc.WorkflowServiceBlockingStub workflowServiceStub() {
        return workflowServiceStub;
    }
}
