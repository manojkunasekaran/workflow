package com.app.api.service.mcp;

import com.app.common.constant.TriggerRegistrationStatus;
import com.app.common.entity.TriggerRegistration;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.model.trigger.McpTriggerConfig;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.persistence.repository.TriggerRegistrationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.EnumSet;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class McpTriggerRegistrationService {

    private static final EnumSet<TriggerType> MCP_TYPES = EnumSet.of(TriggerType.MCP);

    private final TriggerRegistrationRepository registrationRepository;
    private final McpStreamableServerService mcpStreamableServerService;

    public void sync(WorkflowDefinition definition) {
        TriggerConfig trigger = definition.getTrigger();
        if (trigger == null || trigger.getType() == null || !MCP_TYPES.contains(trigger.getType())) {
            return;
        }

        boolean active = isActive(trigger);
        McpTriggerConfig mcp = trigger.getMcp();
        String toolName = mcp != null ? mcp.getToolName() : null;

        TriggerRegistration registration = upsertRegistration(definition, active, toolName);
        log.debug("Synced MCP trigger registration for workflow {}: toolName={}, status={}",
                definition.getId(), toolName, registration.getStatus());
        mcpStreamableServerService.refreshTools();
    }

    public void deactivate(String workflowDefinitionId) {
        registrationRepository.findByWorkflowDefinitionId(workflowDefinitionId).ifPresent(reg -> {
            if (reg.getTriggerType() == TriggerType.MCP) {
                reg.setStatus(TriggerRegistrationStatus.DISABLED);
                reg.setMcpToolName(null);
                registrationRepository.save(reg);
                mcpStreamableServerService.refreshTools();
            }
        });
    }

    private TriggerRegistration upsertRegistration(
            WorkflowDefinition definition, boolean active, String toolName) {
        Optional<TriggerRegistration> existing =
                registrationRepository.findByWorkflowDefinitionId(definition.getId());

        TriggerRegistration registration = existing.orElseGet(() -> TriggerRegistration.builder()
                .id(UUID.randomUUID().toString())
                .workflowDefinitionId(definition.getId())
                .triggerType(TriggerType.MCP)
                .activatedAt(Instant.now())
                .build());

        registration.setWorkflowDefinitionId(definition.getId());
        registration.setTriggerType(TriggerType.MCP);
        registration.setStatus(active ? TriggerRegistrationStatus.ACTIVE : TriggerRegistrationStatus.PAUSED);
        registration.setMcpToolName(active ? toolName : null);

        if (registration.getActivatedAt() == null) {
            registration.setActivatedAt(Instant.now());
        }

        return registrationRepository.save(registration);
    }

    private boolean isActive(TriggerConfig trigger) {
        if (trigger == null || trigger.getType() != TriggerType.MCP) {
            return false;
        }
        McpTriggerConfig mcp = trigger.getMcp();
        return mcp == null || mcp.isActive();
    }
}
