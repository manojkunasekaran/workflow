package com.app.api.validation;

import com.app.common.entity.WorkflowDefinition;
import com.app.common.exception.ValidationException;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.parameters.HumanTaskParameters;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class WorkflowDefinitionValidator {

    public void validate(WorkflowDefinition definition) {
        if (definition.getName() == null || definition.getName().isBlank()) {
            throw new ValidationException("Workflow name is required");
        }

        List<WorkflowTask> tasks = definition.getTasks();
        if (tasks == null || tasks.isEmpty()) {
            throw new ValidationException("Workflow must contain at least one task");
        }

        Set<String> taskIds = new HashSet<>();
        for (WorkflowTask task : tasks) {
            if (task.getTaskId() == null || task.getTaskId().isBlank()) {
                throw new ValidationException("Task ID is required");
            }
            if (!taskIds.add(task.getTaskId())) {
                throw new ValidationException("Duplicate task ID: " + task.getTaskId());
            }
        }

        for (WorkflowTask task : tasks) {
            if (task.getType() == TaskType.HUMAN_TASK
                    && task.getParameters() instanceof HumanTaskParameters params) {
                validateHumanRouting(task.getTaskId(), params, taskIds);
            }
        }
    }

    private void validateHumanRouting(String taskId, HumanTaskParameters params, Set<String> taskIds) {
        validateOptionalRef(taskId, params.getApprovedNextTaskId(), taskIds, "approvedNextTaskId");
        validateOptionalRef(taskId, params.getRejectedNextTaskId(), taskIds, "rejectedNextTaskId");
    }

    private void validateOptionalRef(String taskId, String ref, Set<String> taskIds, String field) {
        if (ref == null || ref.isBlank()) {
            return;
        }
        if (ref.equals(taskId)) {
            throw new ValidationException("Human task " + taskId + " cannot route to itself (" + field + ")");
        }
        if (!taskIds.contains(ref)) {
            throw new ValidationException("Human task " + taskId + " references unknown task in " + field + ": " + ref);
        }
    }
}
