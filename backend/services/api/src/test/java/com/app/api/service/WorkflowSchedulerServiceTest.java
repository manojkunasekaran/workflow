package com.app.api.service;

import com.app.common.entity.WorkflowDefinition;
import com.app.common.model.trigger.ScheduleConfig;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import net.javacrumbs.shedlock.core.LockingTaskExecutor;

import java.time.Duration;

import com.app.api.config.properties.WorkflowApiProperties;

@ExtendWith(MockitoExtension.class)
class WorkflowSchedulerServiceTest {

    @Mock
    private WorkflowDefinitionRepository definitionRepository;

    @Mock
    private WorkflowExecutionService executionService;
    
    @Mock
    private LockingTaskExecutor lockingTaskExecutor;

    private WorkflowSchedulerService schedulerService;

    @BeforeEach
    void setUp() {
        schedulerService = new WorkflowSchedulerService(
            definitionRepository, 
            executionService, 
            lockingTaskExecutor, 
            new WorkflowApiProperties()
        );
    }

    @Test
    void testLoadSchedules_RegistersActiveSchedules() {
        // Arrange
        WorkflowDefinition wf1 = new WorkflowDefinition();
        wf1.setId("wf-1");
        wf1.setTrigger(TriggerConfig.builder()
                .type(TriggerType.SCHEDULE)
                .schedule(ScheduleConfig.builder().active(true).cronExpression("0 */5 * * * *").build())
                .build());

        WorkflowDefinition wf2 = new WorkflowDefinition();
        wf2.setId("wf-2");
        wf2.setTrigger(TriggerConfig.builder()
                .type(TriggerType.SCHEDULE)
                .schedule(ScheduleConfig.builder().active(false).cronExpression("0 */15 * * * *").build())
                .build());

        when(definitionRepository.findAll()).thenReturn(List.of(wf1, wf2));

        // Act
        schedulerService.loadSchedules();

        // Assert
        assertTrue(schedulerService.hasActiveSchedule("wf-1"));
        assertFalse(schedulerService.hasActiveSchedule("wf-2"));
    }

    @Test
    void testSyncSchedule_RegistersNewSchedule() {
        // Arrange
        WorkflowDefinition wf = new WorkflowDefinition();
        wf.setId("wf-3");
        wf.setTrigger(TriggerConfig.builder()
                .type(TriggerType.SCHEDULE)
                .schedule(ScheduleConfig.builder().active(true).cronExpression("0 0 * * * *").build())
                .build());

        assertFalse(schedulerService.hasActiveSchedule("wf-3"));

        // Act
        schedulerService.syncSchedule(wf);

        // Assert
        assertTrue(schedulerService.hasActiveSchedule("wf-3"));
    }

    @Test
    void testSyncSchedule_CancelsExistingScheduleWhenDisabled() {
        // Arrange
        WorkflowDefinition wf = new WorkflowDefinition();
        wf.setId("wf-4");
        wf.setTrigger(TriggerConfig.builder()
                .type(TriggerType.SCHEDULE)
                .schedule(ScheduleConfig.builder().active(true).cronExpression("0 0 * * * *").build())
                .build());

        schedulerService.syncSchedule(wf);
        assertTrue(schedulerService.hasActiveSchedule("wf-4"));

        // Update to disabled
        wf.getTrigger().getSchedule().setActive(false);

        // Act
        schedulerService.syncSchedule(wf);

        // Assert
        assertFalse(schedulerService.hasActiveSchedule("wf-4"));
    }
}
