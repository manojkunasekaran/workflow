package com.app.api.service;

import com.app.common.constant.ExecutionType;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.model.trigger.ScheduleConfig;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.persistence.repository.WorkflowDefinitionRepository;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.TimeZone;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

import net.javacrumbs.shedlock.core.LockingTaskExecutor;
import net.javacrumbs.shedlock.core.LockConfiguration;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import com.app.api.config.properties.WorkflowApiProperties;

/**
 * Manages cron-based workflow schedules within the API service.
 *
 * <p>On startup, loads all workflow definitions with active SCHEDULE triggers
 * and registers them with Spring's {@link TaskScheduler}. When a workflow
 * is saved/updated, {@link #syncSchedule} registers or cancels accordingly.
 *
 * <p>Delegates entirely to {@link WorkflowExecutionService#triggerExecution}
 * — no duplicate execution logic.
 */
@Slf4j
@Service
public class WorkflowSchedulerService {

    private final WorkflowDefinitionRepository definitionRepository;
    private final WorkflowExecutionService executionService;
    private final TaskScheduler taskScheduler;
    private final LockingTaskExecutor lockingTaskExecutor;

    /** Active scheduled futures keyed by workflowDefinitionId. */
    private final Map<String, ScheduledFuture<?>> activeSchedules = new ConcurrentHashMap<>();

    private final WorkflowApiProperties apiProperties;

    public WorkflowSchedulerService(
            WorkflowDefinitionRepository definitionRepository,
            WorkflowExecutionService executionService,
            LockingTaskExecutor lockingTaskExecutor,
            WorkflowApiProperties apiProperties) {
        this.definitionRepository = definitionRepository;
        this.executionService = executionService;
        this.lockingTaskExecutor = lockingTaskExecutor;
        this.apiProperties = apiProperties;

        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(4);
        scheduler.setThreadNamePrefix("wf-scheduler-");
        scheduler.setDaemon(true);
        scheduler.initialize();
        this.taskScheduler = scheduler;
    }

    /**
     * Load all active SCHEDULE triggers on application startup.
     */
    @PostConstruct
    public void loadSchedules() {
        List<WorkflowDefinition> definitions = definitionRepository.findAll();
        int registered = 0;

        for (WorkflowDefinition definition : definitions) {
            TriggerConfig trigger = definition.getTrigger();
            if (trigger != null
                    && trigger.getType() == TriggerType.SCHEDULE
                    && trigger.getSchedule() != null
                    && trigger.getSchedule().isActive()) {
                registerSchedule(definition.getId(), trigger.getSchedule());
                registered++;
            }
        }

        log.info("Loaded {} active workflow schedules on startup", registered);
    }

    @PreDestroy
    public void shutdown() {
        activeSchedules.forEach((id, future) -> future.cancel(false));
        activeSchedules.clear();
        log.info("Cancelled all active workflow schedules on shutdown");
    }

    /**
     * Synchronize a workflow's schedule based on its current trigger config.
     * Called by {@link WorkflowDefinitionService} whenever a definition is saved.
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
        cancelSchedule(workflowId);

        try {
            String timezone = config.getTimezone() != null ? config.getTimezone() : "UTC";
            CronTrigger cronTrigger = new CronTrigger(
                    config.getCronExpression(),
                    TimeZone.getTimeZone(timezone));

            ScheduledFuture<?> future = taskScheduler.schedule(
                    () -> triggerWorkflow(workflowId), cronTrigger);

            activeSchedules.put(workflowId, future);
            log.info("Registered schedule for workflow {}: cron='{}', tz='{}'",
                    workflowId, config.getCronExpression(), timezone);
        } catch (IllegalArgumentException e) {
            log.error("Invalid cron expression for workflow {}: '{}'",
                    workflowId, config.getCronExpression(), e);
        }
    }

    /**
     * Cancel a workflow's schedule if one exists.
     */
    public void cancelSchedule(String workflowId) {
        ScheduledFuture<?> existing = activeSchedules.remove(workflowId);
        if (existing != null) {
            existing.cancel(false);
            log.info("Cancelled schedule for workflow {}", workflowId);
        }
    }

    /**
     * Fire the workflow execution via existing service layer.
     */
    private void triggerWorkflow(String workflowId) {
        try {
            // Calculate a lock name based on workflow ID and current minute to ensure only one node fires per minute-level trigger
            String lockName = "wf-schedule-" + workflowId + "-" + (System.currentTimeMillis() / 60000);
            
            LockConfiguration lockConfig = new LockConfiguration(
                Instant.now(),
                lockName,
                apiProperties.getScheduler().getLockAtMostFor(),
                apiProperties.getScheduler().getLockAtLeastFor()

            );
            
            lockingTaskExecutor.executeWithLock((Runnable) () -> {
                executionService.triggerExecution(
                        workflowId, null, ExecutionType.ASYNC, TriggerType.SCHEDULE);
                log.info("Schedule-triggered workflow execution: workflowId={}", workflowId);
            }, lockConfig);
        } catch (Exception e) {
            log.error("Failed to schedule-trigger workflow {}: {}",
                    workflowId, e.getMessage(), e);
        }
    }

    public boolean hasActiveSchedule(String workflowId) {
        ScheduledFuture<?> future = activeSchedules.get(workflowId);
        return future != null && !future.isCancelled();
    }
}
