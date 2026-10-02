package com.app.api.service.mcp;

import com.app.common.entity.TriggerMcpLog;
import com.app.persistence.repository.TriggerMcpLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class McpAuditService {

    private final TriggerMcpLogRepository logRepository;

    public void logAuthFailure(String endpoint, String error, long startMs) {
        save(TriggerMcpLog.builder()
                .endpoint(endpoint)
                .authSuccess(false)
                .success(false)
                .error(error)
                .timestamp(Instant.now())
                .durationMs(System.currentTimeMillis() - startMs)
                .build());
    }

    public void logRequest(
            String endpoint,
            String registrationId,
            String workflowDefinitionId,
            String toolName,
            boolean success,
            String error,
            String executionId,
            long startMs) {
        save(TriggerMcpLog.builder()
                .endpoint(endpoint)
                .registrationId(registrationId)
                .workflowDefinitionId(workflowDefinitionId)
                .toolName(toolName)
                .authSuccess(true)
                .success(success)
                .error(error)
                .executionId(executionId)
                .timestamp(Instant.now())
                .durationMs(System.currentTimeMillis() - startMs)
                .build());
    }

    public Page<TriggerMcpLog> getLogs(Pageable pageable) {
        return logRepository.findAllByOrderByTimestampDesc(pageable);
    }

    private void save(TriggerMcpLog entry) {
        if (entry.getId() == null) {
            entry.setId(UUID.randomUUID().toString());
        }
        logRepository.save(entry);
    }
}
