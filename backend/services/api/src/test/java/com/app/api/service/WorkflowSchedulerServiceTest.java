package com.app.api.service;

import com.app.api.config.properties.WorkflowApiProperties;
import com.app.api.schedule.PollScheduleNormalizer;
import com.app.api.schedule.TriggerScheduleRegistrar;
import com.app.api.service.poll.PollExecutionService;
import com.app.api.service.poll.TriggerRegistrationService;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.model.trigger.PollConfig;
import com.app.common.model.trigger.PollHttpConfig;
import com.app.common.model.trigger.PollScheduleConfig;
import com.app.common.model.trigger.PollScheduleMode;
import com.app.common.model.trigger.ScheduleConfig;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import net.javacrumbs.shedlock.core.LockingTaskExecutor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkflowSchedulerServiceTest {

    @Mock
    private WorkflowDefinitionRepository definitionRepository;

    @Mock
    private WorkflowExecutionService executionService;

    @Mock
    private LockingTaskExecutor lockingTaskExecutor;

    @Mock
    private TriggerRegistrationService triggerRegistrationService;

    @Mock
    private PollExecutionService pollExecutionService;

    private WorkflowSchedulerService schedulerService;

    @BeforeEach
    void setUp() {
        schedulerService = new WorkflowSchedulerService(
                definitionRepository,
                executionService,
                lockingTaskExecutor,
                new WorkflowApiProperties(),
                new TriggerScheduleRegistrar(),
                new PollScheduleNormalizer(),
                triggerRegistrationService,
                pollExecutionService);
    }

    @Test
    void testLoadSchedules_RegistersActiveSchedules() {
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

        schedulerService.loadSchedules();

        assertTrue(schedulerService.hasActiveSchedule("wf-1"));
        assertFalse(schedulerService.hasActiveSchedule("wf-2"));
    }

    @Test
    void testSyncSchedule_RegistersNewSchedule() {
        WorkflowDefinition wf = new WorkflowDefinition();
        wf.setId("wf-3");
        wf.setTrigger(TriggerConfig.builder()
                .type(TriggerType.SCHEDULE)
                .schedule(ScheduleConfig.builder().active(true).cronExpression("0 0 * * * *").build())
                .build());

        assertFalse(schedulerService.hasActiveSchedule("wf-3"));

        schedulerService.syncSchedule(wf);

        assertTrue(schedulerService.hasActiveSchedule("wf-3"));
    }

    @Test
    void testSyncSchedule_CancelsExistingScheduleWhenDisabled() {
        WorkflowDefinition wf = new WorkflowDefinition();
        wf.setId("wf-4");
        wf.setTrigger(TriggerConfig.builder()
                .type(TriggerType.SCHEDULE)
                .schedule(ScheduleConfig.builder().active(true).cronExpression("0 0 * * * *").build())
                .build());

        schedulerService.syncSchedule(wf);
        assertTrue(schedulerService.hasActiveSchedule("wf-4"));

        wf.getTrigger().getSchedule().setActive(false);
        schedulerService.syncSchedule(wf);

        assertFalse(schedulerService.hasActiveSchedule("wf-4"));
    }

    @Test
    void testSyncPollTrigger_RegistersCronPoll() {
        WorkflowDefinition wf = buildPollWorkflow("poll-1", 300L);
        assertFalse(schedulerService.hasActivePollTrigger("poll-1"));

        schedulerService.syncPollTrigger(wf);

        assertTrue(schedulerService.hasActivePollTrigger("poll-1"));
        verify(triggerRegistrationService).upsertOnSync(wf);
    }

    @Test
    void testSyncPollTrigger_RegistersFixedRateForSubMinuteInterval() {
        WorkflowDefinition wf = buildPollWorkflow("poll-2", 90L);
        schedulerService.syncPollTrigger(wf);

        assertTrue(schedulerService.hasActivePollTrigger("poll-2"));
    }

    @Test
    void testSyncPollTrigger_CancelsWhenDisabled() {
        WorkflowDefinition wf = buildPollWorkflow("poll-3", 300L);
        schedulerService.syncPollTrigger(wf);
        assertTrue(schedulerService.hasActivePollTrigger("poll-3"));

        wf.getTrigger().getPoll().setActive(false);
        schedulerService.syncPollTrigger(wf);

        assertFalse(schedulerService.hasActivePollTrigger("poll-3"));
        verify(triggerRegistrationService).deactivate("poll-3");
    }

    @Test
    void testLoadSchedules_RegistersActivePollTriggers() {
        WorkflowDefinition wf = buildPollWorkflow("poll-4", 300L);
        when(definitionRepository.findAll()).thenReturn(List.of(wf));

        schedulerService.loadSchedules();

        assertTrue(schedulerService.hasActivePollTrigger("poll-4"));
    }

    private WorkflowDefinition buildPollWorkflow(String id, long intervalSeconds) {
        WorkflowDefinition wf = new WorkflowDefinition();
        wf.setId(id);
        wf.setTrigger(TriggerConfig.builder()
                .type(TriggerType.POLL)
                .poll(PollConfig.builder()
                        .active(true)
                        .schedule(PollScheduleConfig.builder()
                                .mode(PollScheduleMode.FIXED_INTERVAL)
                                .intervalSeconds(intervalSeconds)
                                .build())
                        .http(PollHttpConfig.builder()
                                .url("https://api.example.com/items")
                                .method("GET")
                                .build())
                        .build())
                .build());
        return wf;
    }
}
