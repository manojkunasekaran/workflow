package com.app.api.service;

import com.app.api.validation.WorkflowDefinitionValidator;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.trigger.PollConfig;
import com.app.common.model.trigger.PollHttpConfig;
import com.app.common.model.trigger.PollScheduleConfig;
import com.app.common.model.trigger.PollScheduleMode;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import com.app.persistence.repository.WorkflowExecutionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkflowDefinitionServiceTest {

    @Mock
    private WorkflowDefinitionRepository repository;

    @Mock
    private WorkflowDefinitionValidator validator;

    @Mock
    private TriggerActivationService triggerActivationService;

    @Mock
    private WorkflowExecutionService executionService;

    @Mock
    private WorkflowExecutionRepository executionRepository;

    @InjectMocks
    private WorkflowDefinitionService service;

    private WorkflowDefinition pollWorkflow;

    @BeforeEach
    void setUp() {
        pollWorkflow = buildPollWorkflow("def-1");
    }

    @Test
    void createWorkflowDefinition_activatesTriggers() {
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.createWorkflowDefinition(pollWorkflow);

        verify(triggerActivationService).sync(pollWorkflow);
    }

    @Test
    void updateWorkflowDefinition_updatesInPlaceAndSyncsTriggers() {
        when(repository.findById("def-1")).thenReturn(Optional.of(pollWorkflow));
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        WorkflowDefinition updated = buildPollWorkflow("def-1");
        updated.setName("Updated name");

        WorkflowDefinition saved = service.updateWorkflowDefinition("def-1", updated);

        assertThat(saved.getId()).isEqualTo("def-1");
        assertThat(saved.getName()).isEqualTo("Updated name");
        verify(triggerActivationService, never()).deactivate(any());
        verify(triggerActivationService).sync(saved);
    }

    @Test
    void getAllWorkflowDefinitions_returnsAllWorkflows() {
        when(repository.findAll()).thenReturn(List.of(pollWorkflow));

        List<WorkflowDefinition> result = service.getAllWorkflowDefinitions();

        assertThat(result).containsExactly(pollWorkflow);
        verify(repository).findAll();
    }

    @Test
    void getWorkflowDefinitionById_returnsDefinitionById() {
        when(repository.findById("def-1")).thenReturn(Optional.of(pollWorkflow));

        Optional<WorkflowDefinition> result = service.getWorkflowDefinitionById("def-1");

        assertThat(result).contains(pollWorkflow);
    }

    private WorkflowDefinition buildPollWorkflow(String id) {
        WorkflowDefinition definition = new WorkflowDefinition();
        definition.setId(id);
        definition.setName("Poll workflow");
        WorkflowTask task = new WorkflowTask();
        task.setTaskId("task_1");
        task.setType(TaskType.HTTP_TASK);
        definition.setTasks(List.of(task));
        definition.setTrigger(TriggerConfig.builder()
                .type(TriggerType.POLL)
                .poll(PollConfig.builder()
                        .active(true)
                        .schedule(PollScheduleConfig.builder()
                                .mode(PollScheduleMode.FIXED_INTERVAL)
                                .intervalSeconds(300L)
                                .build())
                        .http(PollHttpConfig.builder()
                                .url("https://api.example.com/items")
                                .method("GET")
                                .build())
                        .build())
                .build());
        return definition;
    }
}
