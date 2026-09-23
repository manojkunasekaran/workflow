package com.app.api.validation;

import com.app.common.entity.WorkflowDefinition;
import com.app.common.exception.ValidationException;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.parameters.ConnectorTaskParameters;
import com.app.common.model.task.parameters.HumanTaskParameters;
import com.app.persistence.connector.ConnectorRegistry;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class WorkflowDefinitionValidator {

    private final ConnectorRegistry connectorRegistry;

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
            } else if (task.getType() == TaskType.CONNECTOR_TASK
                    && task.getParameters() instanceof ConnectorTaskParameters params) {
                validateConnectorTask(task.getTaskId(), params);
            }
        }
        
        validateGraph(tasks, taskIds);
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

    private void validateConnectorTask(String taskId, ConnectorTaskParameters params) {
        if (params.getConnectorId() == null || params.getConnectorId().isBlank()) {
            throw new ValidationException("Connector ID is required for connector task: " + taskId);
        }
        if (params.getActionId() == null || params.getActionId().isBlank()) {
            throw new ValidationException("Action ID is required for connector task: " + taskId);
        }
        // Verify connector exists
        var manifest = connectorRegistry.findById(params.getConnectorId())
                .orElseThrow(() -> new ValidationException("Unknown connector ID '" + params.getConnectorId() + "' in task: " + taskId));
        // Verify action exists
        manifest.getActions().stream()
                .filter(a -> a.getActionId().equals(params.getActionId()))
                .findFirst()
                .orElseThrow(() -> new ValidationException("Unknown action ID '" + params.getActionId() + "' for connector '" + params.getConnectorId() + "' in task: " + taskId));
    }

    private void validateGraph(List<WorkflowTask> tasks, Set<String> taskIds) {
        java.util.Map<String, List<String>> adjList = new java.util.HashMap<>();
        for (int i = 0; i < tasks.size(); i++) {
            WorkflowTask task = tasks.get(i);
            String taskId = task.getTaskId();
            List<String> edges = new java.util.ArrayList<>();
            boolean hasExplicit = false;
            
            if (task.getNextTaskId() != null && !task.getNextTaskId().isBlank()) {
                edges.add(task.getNextTaskId());
                hasExplicit = true;
            }
            
            if (task.getType() == TaskType.CONDITIONAL && task.getParameters() instanceof com.app.common.model.task.parameters.ConditionalTaskParameters params) {
                hasExplicit = true;
                if (params.getDefaultNextTaskId() != null && !params.getDefaultNextTaskId().isBlank()) {
                    edges.add(params.getDefaultNextTaskId());
                }
                if (params.getBranches() != null) {
                    for (var branch : params.getBranches()) {
                        if (branch.getNextTaskId() != null && !branch.getNextTaskId().isBlank()) {
                            edges.add(branch.getNextTaskId());
                        }
                    }
                }
            } else if (task.getType() == TaskType.HUMAN_TASK && task.getParameters() instanceof HumanTaskParameters params) {
                hasExplicit = true;
                if (params.getApprovedNextTaskId() != null && !params.getApprovedNextTaskId().isBlank()) {
                    edges.add(params.getApprovedNextTaskId());
                }
                if (params.getRejectedNextTaskId() != null && !params.getRejectedNextTaskId().isBlank()) {
                    edges.add(params.getRejectedNextTaskId());
                }
            } else if (task.getType() == TaskType.BRANCH && task.getParameters() instanceof com.app.common.model.task.parameters.BranchTaskParameters params) {
                hasExplicit = true;
                if (params.getJoinTaskId() != null && !params.getJoinTaskId().isBlank()) {
                    edges.add(params.getJoinTaskId());
                }
                if (params.getBranches() != null) {
                    for (var branch : params.getBranches()) {
                        if (branch.getStartTaskId() != null && !branch.getStartTaskId().isBlank()) {
                            edges.add(branch.getStartTaskId());
                        }
                    }
                }
            } else if (task.getType() == TaskType.ITERATOR_TASK && task.getParameters() instanceof com.app.common.model.task.parameters.IteratorTaskParameters params) {
                hasExplicit = true;
                if (params.getDoneNextTaskId() != null && !params.getDoneNextTaskId().isBlank()) {
                    edges.add(params.getDoneNextTaskId());
                }
            }

            if (!hasExplicit) {
                for (int j = i + 1; j < tasks.size(); j++) {
                    if (!Boolean.TRUE.equals(tasks.get(j).getIsTool())) {
                        edges.add(tasks.get(j).getTaskId());
                        break;
                    }
                }
            }
            
            for (String edge : edges) {
                if (!taskIds.contains(edge)) {
                    throw new ValidationException("Task " + taskId + " references unknown task: " + edge);
                }
            }
            
            adjList.put(taskId, edges);
        }

        java.util.Map<String, Integer> state = new java.util.HashMap<>();
        for (String taskId : taskIds) {
            state.put(taskId, 0);
        }

        for (String taskId : taskIds) {
            if (state.get(taskId) == 0) {
                if (hasCycle(taskId, adjList, state)) {
                    throw new ValidationException("Workflow contains an infinite loop/cycle which is not permitted.");
                }
            }
        }
    }

    private boolean hasCycle(String startNode, java.util.Map<String, List<String>> adjList, java.util.Map<String, Integer> state) {
        java.util.Stack<String> stack = new java.util.Stack<>();
        stack.push(startNode);
        
        while (!stack.isEmpty()) {
            String node = stack.peek();
            
            if (state.get(node) == 0) {
                state.put(node, 1);
                List<String> edges = adjList.getOrDefault(node, List.of());
                boolean hasUnvisited = false;
                for (String neighbor : edges) {
                    int neighborState = state.get(neighbor);
                    if (neighborState == 1) {
                        return true;
                    } else if (neighborState == 0) {
                        stack.push(neighbor);
                        hasUnvisited = true;
                    }
                }
                if (hasUnvisited) {
                    continue;
                }
            }
            
            if (state.get(node) == 1) {
                state.put(node, 2);
            }
            stack.pop();
        }
        return false;
    }
}
