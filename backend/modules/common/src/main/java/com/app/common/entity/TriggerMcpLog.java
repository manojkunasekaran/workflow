package com.app.common.entity;

import com.app.common.constant.CollectionNames;
import com.app.common.model.base.Auditable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Audit record for inbound MCP server requests (auth, tool list, tool call).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = CollectionNames.TRIGGER_MCP_LOGS)
public class TriggerMcpLog extends Auditable {

    @Id
    private String id;

    private String registrationId;
    private String workflowDefinitionId;
    private String endpoint;
    private String toolName;
    private boolean authSuccess;
    private boolean success;
    private String error;
    private String executionId;
    private Instant timestamp;
    private Long durationMs;
}
