package com.app.api.service.mcp;

import com.app.common.constant.TriggerRegistrationStatus;
import com.app.common.entity.TriggerRegistration;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.model.trigger.McpTriggerConfig;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.persistence.repository.TriggerRegistrationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class McpTriggerRegistrationServiceTest {

    @Mock
    private TriggerRegistrationRepository registrationRepository;

    @Mock
    private McpStreamableServerService mcpStreamableServerService;

    private McpTriggerRegistrationService service;

    @BeforeEach
    void setUp() {
        service = new McpTriggerRegistrationService(registrationRepository, mcpStreamableServerService);
    }

    @Test
    void sync_registersActiveMcpTool() {
        WorkflowDefinition definition = mcpDefinition("wf-1", "run_report", true);

        when(registrationRepository.findByWorkflowDefinitionId("wf-1")).thenReturn(Optional.empty());
        when(registrationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.sync(definition);

        ArgumentCaptor<TriggerRegistration> captor = ArgumentCaptor.forClass(TriggerRegistration.class);
        verify(registrationRepository).save(captor.capture());

        TriggerRegistration saved = captor.getValue();
        assertEquals("wf-1", saved.getWorkflowDefinitionId());
        assertEquals(TriggerType.MCP, saved.getTriggerType());
        assertEquals(TriggerRegistrationStatus.ACTIVE, saved.getStatus());
        assertEquals("run_report", saved.getMcpToolName());
    }

    @Test
    void deactivate_disablesRegistration() {
        TriggerRegistration existing = TriggerRegistration.builder()
                .id("reg-1")
                .workflowDefinitionId("wf-1")
                .triggerType(TriggerType.MCP)
                .mcpToolName("run_report")
                .status(TriggerRegistrationStatus.ACTIVE)
                .build();

        when(registrationRepository.findByWorkflowDefinitionId("wf-1")).thenReturn(Optional.of(existing));
        when(registrationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.deactivate("wf-1");

        ArgumentCaptor<TriggerRegistration> captor = ArgumentCaptor.forClass(TriggerRegistration.class);
        verify(registrationRepository).save(captor.capture());
        assertEquals(TriggerRegistrationStatus.DISABLED, captor.getValue().getStatus());
    }

    private WorkflowDefinition mcpDefinition(String id, String toolName, boolean active) {
        WorkflowDefinition definition = new WorkflowDefinition();
        definition.setId(id);
        definition.setName("MCP Workflow");
        definition.setTrigger(TriggerConfig.builder()
                .type(TriggerType.MCP)
                .mcp(McpTriggerConfig.builder()
                        .toolName(toolName)
                        .active(active)
                        .build())
                .build());
        return definition;
    }
}
