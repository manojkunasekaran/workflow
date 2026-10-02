package com.app.api.service.mcp;

import com.app.common.constant.TriggerRegistrationStatus;
import com.app.common.entity.TriggerRegistration;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.exception.ResourceNotFoundException;
import com.app.common.exception.ValidationException;
import com.app.common.model.mcp.McpToolDescriptor;
import com.app.common.model.trigger.McpTriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.persistence.repository.TriggerRegistrationRepository;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class McpToolCatalogService {

    private final TriggerRegistrationRepository registrationRepository;
    private final WorkflowDefinitionRepository definitionRepository;
    private final McpInputSchemaBuilder inputSchemaBuilder;

    public List<McpToolDescriptor> listGlobalTools() {
        List<McpToolDescriptor> tools = new ArrayList<>();
        List<TriggerRegistration> registrations = registrationRepository.findByTriggerTypeAndStatus(
                TriggerType.MCP, TriggerRegistrationStatus.ACTIVE);

        for (TriggerRegistration registration : registrations) {
            toDescriptor(registration).ifPresent(tools::add);
        }
        return tools;
    }

    public List<McpToolDescriptor> listWorkflowTools(String workflowId) {
        TriggerRegistration registration = registrationRepository.findByWorkflowDefinitionId(workflowId)
                .filter(reg -> reg.getTriggerType() == TriggerType.MCP)
                .filter(reg -> reg.getStatus() == TriggerRegistrationStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("MCP trigger", workflowId));

        return toDescriptor(registration)
                .map(List::of)
                .orElse(List.of());
    }

    public ResolvedMcpTool resolveGlobalTool(String toolName) {
        TriggerRegistration registration = registrationRepository
                .findByMcpToolNameAndStatus(toolName, TriggerRegistrationStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("MCP tool", toolName));

        WorkflowDefinition definition = definitionRepository.findById(registration.getWorkflowDefinitionId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "WorkflowDefinition", registration.getWorkflowDefinitionId()));

        validateMcpActive(definition, toolName);
        return new ResolvedMcpTool(definition, registration);
    }

    public ResolvedMcpTool resolveWorkflowTool(String workflowId, String toolName) {
        WorkflowDefinition definition = definitionRepository.findById(workflowId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowDefinition", workflowId));

        validateMcpActive(definition, toolName);

        McpTriggerConfig mcp = definition.getTrigger().getMcp();
        if (!toolName.equals(mcp.getToolName())) {
            throw new ResourceNotFoundException("MCP tool", toolName);
        }

        TriggerRegistration registration = registrationRepository.findByWorkflowDefinitionId(workflowId)
                .orElseThrow(() -> new ResourceNotFoundException("MCP trigger", workflowId));

        return new ResolvedMcpTool(definition, registration);
    }

    private Optional<McpToolDescriptor> toDescriptor(TriggerRegistration registration) {
        return definitionRepository.findById(registration.getWorkflowDefinitionId())
                .flatMap(definition -> {
                    if (definition.getTrigger() == null
                            || definition.getTrigger().getType() != TriggerType.MCP
                            || definition.getTrigger().getMcp() == null) {
                        return Optional.empty();
                    }
                    McpTriggerConfig mcp = definition.getTrigger().getMcp();
                    if (!mcp.isActive() || mcp.getToolName() == null || mcp.getToolName().isBlank()) {
                        return Optional.empty();
                    }
                    return Optional.of(new McpToolDescriptor(
                            mcp.getToolName(),
                            mcp.getDescription(),
                            inputSchemaBuilder.buildSchema(definition.getInputs())));
                });
    }

    private void validateMcpActive(WorkflowDefinition definition, String toolName) {
        if (definition.getTrigger() == null || definition.getTrigger().getType() != TriggerType.MCP) {
            throw new ValidationException("Workflow does not have an MCP trigger configured");
        }
        McpTriggerConfig mcp = definition.getTrigger().getMcp();
        if (mcp == null || !mcp.isActive()) {
            throw new ValidationException("MCP trigger is disabled for workflow '" + definition.getName() + "'");
        }
        if (!toolName.equals(mcp.getToolName())) {
            throw new ResourceNotFoundException("MCP tool", toolName);
        }
    }

    public record ResolvedMcpTool(WorkflowDefinition definition, TriggerRegistration registration) {
    }
}
