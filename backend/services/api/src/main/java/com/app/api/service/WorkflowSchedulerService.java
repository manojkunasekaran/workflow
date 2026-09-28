package com.app.api.service;

import com.app.api.config.properties.WorkflowApiProperties;
import com.app.api.schedule.PollScheduleNormalizer;
import com.app.api.schedule.TriggerScheduleRegistrar;
import com.app.api.schedule.TriggerScheduleSpec;
import com.app.api.service.poll.PollExecutionService;
import com.app.api.service.poll.TriggerRegistrationService;
import com.app.common.constant.ExecutionType;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.model.trigger.PollConfig;
import com.app.common.model.trigger.ScheduleConfig;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.persistence.repository.WorkflowDefinitionRepository;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.core.LockConfiguration;
import net.javacrumbs.shedlock.core.LockingTaskExecutor;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

/**
 * Manages cron-based workflow schedules and poll trigger ticks within the API service.
 *
 * <p>On startup, loads all workflow definitions with active SCHEDULE and POLL triggers.
 * Poll ticks delegate to {@link PollExecutionService#executePoll}; schedule ticks use
 * {@link WorkflowExecutionService#triggerExecution} directly.
 */
@Slf4j
@Service
public class WorkflowSchedulerService {

    private final WorkflowDefinitionRepository definitionRepository;
    private final WorkflowExecutionService executionService;
    private final TaskScheduler taskScheduler;
    private final LockingTaskExecutor lockingTaskExecutor;
    private final WorkflowApiProperties apiProperties;
    private final TriggerScheduleRegistrar scheduleRegistrar;
    private final PollScheduleNormalizer pollScheduleNormalizer;
    private final TriggerRegistrationService triggerRegistrationService;
    private final PollExecutionService pollExecutionService;

    /** Active scheduled futures keyed by workflowDefinitionId. */
    private final Map<String, ScheduledFuture<?>> activeSchedules = new ConcurrentHashMap<>();

    /** Active poll scheduled futures keyed by workflowDefinitionId. */
    private final Map<String, ScheduledFuture<?>> activePollSchedules = new ConcurrentHashMap<>();

    public WorkflowSchedulerService(
            WorkflowDefinitionRepository definitionRepository,
            WorkflowExecutionService executionService,
            LockingTaskExecutor lockingTaskExecutor,
            WorkflowApiProperties apiProperties,
            TriggerScheduleRegistrar scheduleRegistrar,
            PollScheduleNormalizer pollScheduleNormalizer,
            TriggerRegistrationService triggerRegistrationService,
            @Lazy PollExecutionService pollExecutionService) {
        this.definitionRepository = definitionRepository;
        this.executionService = executionService;
        this.lockingTaskExecutor = lockingTaskExecutor;
        this.apiProperties = apiProperties;
        this.scheduleRegistrar = scheduleRegistrar;
        this.pollScheduleNormalizer = pollScheduleNormalizer;
        this.triggerRegistrationService = triggerRegistrationService;
        this.pollExecutionService = pollExecutionService;

        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(4);
        scheduler.setThreadNamePrefix("wf-scheduler-");
        scheduler.setDaemon(true);
        scheduler.initialize();
        this.taskScheduler = scheduler;
    }

    /**
     * Load all active SCHEDULE and POLL triggers on application startup.
     */
    @PostConstruct
    public void loadSchedules() {
        List<WorkflowDefinition> definitions = definitionRepository.findAll();
        int scheduleCount = 0;
        int pollCount = 0;

        for (WorkflowDefinition definition : definitions) {
            TriggerConfig trigger = definition.getTrigger();
            if (trigger == null) {
                continue;
            }
            if (trigger.getType() == TriggerType.SCHEDULE
                    && trigger.getSchedule() != null
                    && trigger.getSchedule().isActive()) {
                registerSchedule(definition.getId(), trigger.getSchedule());
                scheduleCount++;
            }
            if (trigger.getType() == TriggerType.POLL
                    && trigger.getPoll() != null
                    && trigger.getPoll().isActive()) {
                registerPollTrigger(definition);
                pollCount++;
            }
        }

        log.info("Loaded {} active workflow schedules and {} poll triggers on startup",
                scheduleCount, pollCount);
    }

    @PreDestroy
    public void shutdown() {
        activeSchedules.forEach((id, future) -> future.cancel(false));
        activeSchedules.clear();
        activePollSchedules.forEach((id, future) -> future.cancel(false));
        activePollSchedules.clear();
        log.info("Cancelled all active workflow schedules and poll triggers on shutdown");
    }

    /**
     * Synchronize a workflow's schedule based on its current trigger config.
     */
    public void syncSchedule(WorkflowDefinition definition) {
        String workflowId = definition.getId();
        TriggerConfig trigger = definition.getTrigger();

        boolean shouldSchedule = trigger != null
                && trigger.getType() == TriggerType.SCHEDULE
                && trigger.getSchedule() != null
                && trigger.getSchedule().isActive()
                && trigger.getSchedule().getCronExpression() != null
                && !trigger.getSchedule().getCronExpression().isBlank();

        if (shouldSchedule) {
            registerSchedule(workflowId, trigger.getSchedule());
        } else {
            cancelSchedule(workflowId);
        }
    }

    private void registerSchedule(String workflowId, ScheduleConfig config) {
        scheduleRegistrar.cancel(activeSchedules, workflowId);

        try {
            String timezone = config.getTimezone() != null ? config.getTimezone() : "UTC";
            ScheduledFuture<?> future = scheduleRegistrar.registerCron(
                    taskScheduler,
                    config.getCronExpression(),
                    timezone,
                    () -> triggerWorkflow(workflowId));

            activeSchedules.put(workflowId, future);
            log.info("Registered schedule for workflow {}: cron='{}', tz='{}'",
                    workflowId, config.getCronExpression(), timezone);
        } catch (IllegalArgumentException e) {
            log.error("Invalid cron expression for workflow {}: '{}'",
                    workflowId, config.getCronExpression(), e);
        }
    }

    public void cancelSchedule(String workflowId) {
        if (scheduleRegistrar.cancel(activeSchedules, workflowId)) {
            log.info("Cancelled schedule for workflow {}", workflowId);
        }
    }

    private void triggerWorkflow(String workflowId) {
        try {
            String lockName = "wf-schedule-" + workflowId + "-" + (System.currentTimeMillis() / 60000);

            LockConfiguration lockConfig = new LockConfiguration(
                    Instant.now(),
                    lockName,
                    apiProperties.getScheduler().getLockAtMostFor(),
                    apiProperties.getScheduler().getLockAtLeastFor());

            lockingTaskExecutor.executeWithLock((Runnable) () -> {
                executionService.triggerExecution(
                        workflowId, null, ExecutionType.ASYNC, TriggerType.SCHEDULE);
                log.info("Schedule-triggered workflow execution: workflowId={}", workflowId);
            }, lockConfig);
        } catch (Exception e) {
            log.error("Failed to schedule-trigger workflow {}: {}", workflowId, e.getMessage(), e);
        }
    }

    public boolean hasActiveSchedule(String workflowId) {
        ScheduledFuture<?> future = activeSchedules.get(workflowId);
        return future != null && !future.isCancelled();
    }

    /**
     * Synchronize a workflow's poll trigger schedule based on its current config.
     */
    public void syncPollTrigger(WorkflowDefinition definition) {
        String workflowDefinitionId = definition.getId();
        TriggerConfig trigger = definition.getTrigger();

        boolean shouldPoll = trigger != null
                && trigger.getType() == TriggerType.POLL
                && trigger.getPoll() != null
                && trigger.getPoll().isActive();

        if (shouldPoll) {
            triggerRegistrationService.upsertOnSync(definition);
            registerPollTrigger(definition);
        } else {
            cancelPollTrigger(workflowDefinitionId);
            triggerRegistrationService.deactivate(workflowDefinitionId);
        }
    }

    private void registerPollTrigger(WorkflowDefinition definition) {
        String workflowDefinitionId = definition.getId();
        PollConfig poll = definition.getTrigger().getPoll();
        scheduleRegistrar.cancel(activePollSchedules, workflowDefinitionId);

        try {
            TriggerScheduleSpec spec = pollScheduleNormalizer.normalize(poll.getSchedule());
            Runnable tick = () -> executePollTick(workflowDefinitionId);

            ScheduledFuture<?> future;
            if (spec instanceof TriggerScheduleSpec.CronScheduleSpec cronSpec) {
                future = scheduleRegistrar.registerCron(
                        taskScheduler, cronSpec.cronExpression(), cronSpec.timezone(), tick);
                log.info("Registered poll trigger (cron) for workflow {}: cron='{}', tz='{}'",
                        workflowDefinitionId, cronSpec.cronExpression(), cronSpec.timezone());
            } else if (spec instanceof TriggerScheduleSpec.FixedRateScheduleSpec fixedSpec) {
                future = scheduleRegistrar.registerFixedRate(taskScheduler, fixedSpec.interval(), tick);
                log.info("Registered poll trigger (fixed-rate) for workflow {}: interval={}",
                        workflowDefinitionId, fixedSpec.interval());
            } else {
                throw new IllegalStateException("Unknown schedule spec type: " + spec.getClass());
            }

            activePollSchedules.put(workflowDefinitionId, future);
        } catch (IllegalArgumentException e) {
            log.error("Invalid poll schedule for workflow {}: {}", workflowDefinitionId, e.getMessage(), e);
        }
    }

    private void executePollTick(String workflowDefinitionId) {
        try {
            String lockName = "wf-poll-" + workflowDefinitionId;
            LockConfiguration lockConfig = new LockConfiguration(
                    Instant.now(),
                    lockName,
                    apiProperties.getScheduler().getLockAtMostFor(),
                    apiProperties.getScheduler().getLockAtLeastFor());

            lockingTaskExecutor.executeWithLock(
                    (Runnable) () -> pollExecutionService.executePoll(workflowDefinitionId),
                    lockConfig);
        } catch (Exception e) {
            log.error("Failed poll tick for workflow {}: {}", workflowDefinitionId, e.getMessage(), e);
        }
    }

    public void cancelPollTrigger(String workflowDefinitionId) {
        if (scheduleRegistrar.cancel(activePollSchedules, workflowDefinitionId)) {
            log.info("Cancelled poll trigger for workflow {}", workflowDefinitionId);
        }
    }

    public boolean hasActivePollTrigger(String workflowDefinitionId) {
        ScheduledFuture<?> future = activePollSchedules.get(workflowDefinitionId);
        return future != null && !future.isCancelled();
    }
}
