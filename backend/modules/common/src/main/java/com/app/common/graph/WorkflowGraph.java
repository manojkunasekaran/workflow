package com.app.common.graph;

import com.app.common.entity.WorkflowDefinition;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.parameters.JoinTaskParameters;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Topology view of a workflow: tasks, branch-chain edges, and join inbound wires.
 */
public final class WorkflowGraph {

    private final Map<String, WorkflowTask> tasksById;
    private final Map<String, String> chainOut;
    private final Map<String, List<String>> joinInbounds;

    public WorkflowGraph(
            Map<String, WorkflowTask> tasksById,
            Map<String, String> chainOut,
            Map<String, List<String>> joinInbounds) {
        this.tasksById = Map.copyOf(tasksById);
        this.chainOut = Map.copyOf(chainOut);
        this.joinInbounds = copyJoinInbounds(joinInbounds);
    }

    public static WorkflowGraph fromDefinition(WorkflowDefinition definition) {
        if (definition == null || definition.getTasks() == null) {
            return new WorkflowGraph(Map.of(), Map.of(), Map.of());
        }

        Map<String, WorkflowTask> tasksById = new LinkedHashMap<>();
        for (WorkflowTask task : definition.getTasks()) {
            if (task.getTaskId() != null && !task.getTaskId().isBlank()) {
                tasksById.put(task.getTaskId(), task);
            }
        }

        Map<String, String> chainOut = new HashMap<>();
        if (definition.getLayout() != null) {
            for (Map.Entry<String, WorkflowDefinition.NodePosition> entry : definition.getLayout().entrySet()) {
                String sourceId = entry.getKey();
                if (sourceId.startsWith("__")) {
                    continue;
                }
                WorkflowDefinition.NodePosition position = entry.getValue();
                if (position == null || position.getStudioChainOut() == null) {
                    continue;
                }
                String target = position.getStudioChainOut().trim();
                if (!target.isBlank() && !target.startsWith("__")) {
                    chainOut.put(sourceId, target);
                }
            }
        }

        Map<String, List<String>> joinInbounds = new HashMap<>();
        for (WorkflowTask task : definition.getTasks()) {
            if (task.getType() != TaskType.JOIN || !(task.getParameters() instanceof JoinTaskParameters params)) {
                continue;
            }
            List<String> inboundIds = params.getInboundTaskIds() != null
                    ? new ArrayList<>(params.getInboundTaskIds())
                    : List.of();
            joinInbounds.put(task.getTaskId(), inboundIds);
        }

        return new WorkflowGraph(tasksById, chainOut, joinInbounds);
    }

    public WorkflowTask getTask(String taskId) {
        return tasksById.get(taskId);
    }

    public Map<String, WorkflowTask> getTasksById() {
        return tasksById;
    }

    public String getChainOut(String taskId) {
        return chainOut.get(taskId);
    }

    public Map<String, String> getChainOutMap() {
        return chainOut;
    }

    public List<String> getJoinInbounds(String joinTaskId) {
        return joinInbounds.getOrDefault(joinTaskId, List.of());
    }

    public Map<String, List<String>> getJoinInboundsMap() {
        return joinInbounds;
    }

    private static Map<String, List<String>> copyJoinInbounds(Map<String, List<String>> source) {
        Map<String, List<String>> copy = new HashMap<>();
        for (Map.Entry<String, List<String>> entry : source.entrySet()) {
            copy.put(entry.getKey(), List.copyOf(entry.getValue() != null ? entry.getValue() : List.of()));
        }
        return copy;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof WorkflowGraph graph)) {
            return false;
        }
        return Objects.equals(tasksById, graph.tasksById)
                && Objects.equals(chainOut, graph.chainOut)
                && Objects.equals(joinInbounds, graph.joinInbounds);
    }

    @Override
    public int hashCode() {
        return Objects.hash(tasksById, chainOut, joinInbounds);
    }
}
