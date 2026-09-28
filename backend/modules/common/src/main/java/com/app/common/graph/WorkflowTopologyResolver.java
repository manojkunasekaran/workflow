package com.app.common.graph;

import com.app.common.entity.WorkflowDefinition;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.parameters.BranchTaskParameters;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * Pure graph queries for BRANCH/JOIN topology. Single owner of branch tip and join inbound math.
 */
public final class WorkflowTopologyResolver {

    private WorkflowTopologyResolver() {
    }

    public record BranchPath(int branchIndex, String startTaskId, String tipTaskId) {
    }

    public static WorkflowGraph graphFromDefinition(WorkflowDefinition definition) {
        return WorkflowGraph.fromDefinition(definition);
    }

    public static String resolveBranchPathTip(String startTaskId, WorkflowGraph graph) {
        return resolveBranchPathTip(startTaskId, graph, null);
    }

    public static String resolveBranchPathTip(String startTaskId, WorkflowGraph graph, String joinTaskId) {
        if (startTaskId == null || startTaskId.isBlank() || graph == null) {
            return "";
        }

        String ownerBranchId = findOwnerBranchId(startTaskId, graph);
        String current = startTaskId.trim();
        Set<String> visited = new HashSet<>();

        while (current != null && !current.isBlank() && visited.add(current)) {
            if (joinTaskId != null && isInboundForJoin(current, joinTaskId, graph)) {
                return current;
            }

            WorkflowTask task = graph.getTask(current);
            if (task != null && task.getType() == TaskType.JOIN) {
                return current;
            }

            String next = normalize(graph.getChainOut(current));
            if (next.isBlank()) {
                return current;
            }

            if (ownerBranchId != null && isSiblingBranchStart(ownerBranchId, next, startTaskId, graph)) {
                return current;
            }

            WorkflowTask nextTask = graph.getTask(next);
            if (nextTask != null && nextTask.getType() == TaskType.JOIN) {
                return current;
            }

            current = next;
        }

        return current != null ? current : "";
    }

    public static List<String> resolveJoinInbounds(String joinTaskId, WorkflowGraph graph) {
        if (joinTaskId == null || joinTaskId.isBlank() || graph == null) {
            return List.of();
        }
        return List.copyOf(graph.getJoinInbounds(joinTaskId));
    }

    public static List<BranchPath> resolveBranchPaths(String branchTaskId, WorkflowGraph graph) {
        if (branchTaskId == null || branchTaskId.isBlank() || graph == null) {
            return List.of();
        }

        WorkflowTask branchTask = graph.getTask(branchTaskId);
        if (branchTask == null || branchTask.getType() != TaskType.BRANCH
                || !(branchTask.getParameters() instanceof BranchTaskParameters params)) {
            return List.of();
        }

        if (params.getBranches() == null) {
            return List.of();
        }

        List<BranchPath> paths = new ArrayList<>();
        for (int index = 0; index < params.getBranches().size(); index++) {
            BranchTaskParameters.ParallelBranch row = params.getBranches().get(index);
            if (row == null) {
                continue;
            }
            String startTaskId = normalize(row.getStartTaskId());
            if (startTaskId.isBlank()) {
                continue;
            }
            String tipTaskId = resolveBranchPathTip(startTaskId, graph);
            paths.add(new BranchPath(index, startTaskId, tipTaskId));
        }
        return paths;
    }

    public static boolean isInboundForJoin(String taskId, String joinTaskId, WorkflowGraph graph) {
        if (taskId == null || joinTaskId == null || graph == null) {
            return false;
        }
        return resolveJoinInbounds(joinTaskId, graph).contains(taskId);
    }

    public static boolean isLeafInbound(String taskId, String joinTaskId, WorkflowGraph graph) {
        if (!isInboundForJoin(taskId, joinTaskId, graph)) {
            return false;
        }
        WorkflowTask task = graph.getTask(taskId);
        if (task == null) {
            return false;
        }
        return task.getType() != TaskType.BRANCH && task.getType() != TaskType.JOIN;
    }

    public static Set<String> collectSpawnTree(String branchTaskId, WorkflowGraph graph) {
        Set<String> collected = new LinkedHashSet<>();
        if (branchTaskId == null || branchTaskId.isBlank() || graph == null) {
            return collected;
        }
        collectSpawnTreeRecursive(branchTaskId, graph, collected, new HashSet<>());
        return collected;
    }

    private static void collectSpawnTreeRecursive(
            String branchTaskId,
            WorkflowGraph graph,
            Set<String> collected,
            Set<String> processedBranches) {
        if (!processedBranches.add(branchTaskId)) {
            return;
        }
        collected.add(branchTaskId);

        WorkflowTask branchTask = graph.getTask(branchTaskId);
        if (branchTask == null || branchTask.getType() != TaskType.BRANCH
                || !(branchTask.getParameters() instanceof BranchTaskParameters params)
                || params.getBranches() == null) {
            return;
        }

        for (BranchTaskParameters.ParallelBranch row : params.getBranches()) {
            if (row == null) {
                continue;
            }
            String startTaskId = normalize(row.getStartTaskId());
            if (startTaskId.isBlank()) {
                continue;
            }
            collectPathTasks(startTaskId, branchTaskId, graph, collected, processedBranches);
        }
    }

    private static void collectPathTasks(
            String startTaskId,
            String ownerBranchId,
            WorkflowGraph graph,
            Set<String> collected,
            Set<String> processedBranches) {
        String current = startTaskId;
        Set<String> visited = new HashSet<>();

        while (current != null && !current.isBlank() && visited.add(current)) {
            collected.add(current);

            WorkflowTask task = graph.getTask(current);
            if (task != null && task.getType() == TaskType.BRANCH) {
                collectSpawnTreeRecursive(current, graph, collected, processedBranches);
            }

            String next = normalize(graph.getChainOut(current));
            if (next.isBlank()) {
                return;
            }
            if (isSiblingBranchStart(ownerBranchId, next, startTaskId, graph)) {
                return;
            }
            WorkflowTask nextTask = graph.getTask(next);
            if (nextTask != null && nextTask.getType() == TaskType.JOIN) {
                return;
            }
            current = next;
        }
    }

    private static String findOwnerBranchId(String startTaskId, WorkflowGraph graph) {
        for (WorkflowTask task : graph.getTasksById().values()) {
            if (task.getType() != TaskType.BRANCH || !(task.getParameters() instanceof BranchTaskParameters params)) {
                continue;
            }
            if (params.getBranches() == null) {
                continue;
            }
            for (BranchTaskParameters.ParallelBranch row : params.getBranches()) {
                if (row == null) {
                    continue;
                }
                String rowStart = normalize(row.getStartTaskId());
                if (rowStart.equals(startTaskId)) {
                    return task.getTaskId();
                }
                if (!rowStart.isBlank() && isReachableOnBranchPath(rowStart, startTaskId, task.getTaskId(), graph)) {
                    return task.getTaskId();
                }
            }
        }
        return null;
    }

    private static boolean isReachableOnBranchPath(
            String rowStart,
            String targetTaskId,
            String ownerBranchId,
            WorkflowGraph graph) {
        String current = rowStart;
        Set<String> visited = new HashSet<>();
        while (current != null && !current.isBlank() && visited.add(current)) {
            if (current.equals(targetTaskId)) {
                return true;
            }
            String next = normalize(graph.getChainOut(current));
            if (next.isBlank()) {
                return false;
            }
            if (isSiblingBranchStart(ownerBranchId, next, rowStart, graph)) {
                return false;
            }
            WorkflowTask nextTask = graph.getTask(next);
            if (nextTask != null && nextTask.getType() == TaskType.JOIN) {
                return false;
            }
            current = next;
        }
        return false;
    }

    private static boolean isSiblingBranchStart(
            String ownerBranchId,
            String candidateTaskId,
            String pathStartTaskId,
            WorkflowGraph graph) {
        WorkflowTask owner = graph.getTask(ownerBranchId);
        if (owner == null || !(owner.getParameters() instanceof BranchTaskParameters params)
                || params.getBranches() == null) {
            return false;
        }
        for (BranchTaskParameters.ParallelBranch row : params.getBranches()) {
            if (row == null) {
                continue;
            }
            String rowStart = normalize(row.getStartTaskId());
            if (rowStart.isBlank() || rowStart.equals(pathStartTaskId)) {
                continue;
            }
            if (rowStart.equals(candidateTaskId)) {
                return true;
            }
        }
        return false;
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
