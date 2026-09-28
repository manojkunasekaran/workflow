package com.app.common.graph;

import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.parameters.BranchTaskParameters;
import com.app.common.model.task.parameters.JoinTaskParameters;
import com.app.common.model.task.parameters.TaskParameters;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WorkflowTopologyResolverContractTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @TestFactory
    Stream<DynamicTest> contractFixtures() throws Exception {
        Path contractDir = resolveContractDir();
        List<DynamicTest> tests = new ArrayList<>();

        try (Stream<Path> paths = Files.list(contractDir)) {
            Iterator<Path> iterator = paths.filter(path -> path.toString().endsWith(".json")).iterator();
            while (iterator.hasNext()) {
                Path fixturePath = iterator.next();
                String fixtureName = fixturePath.getFileName().toString();
                tests.add(DynamicTest.dynamicTest(fixtureName, () -> runFixture(fixturePath)));
            }
        }

        assertTrue(!tests.isEmpty(), "Expected at least one contract fixture in " + contractDir);
        return tests.stream();
    }

    private static Path resolveContractDir() {
        Path fromModule = Paths.get("../../test-fixtures/workflow-topology").toAbsolutePath().normalize();
        if (Files.isDirectory(fromModule)) {
            return fromModule;
        }
        Path fromRepo = Paths.get("test-fixtures/workflow-topology").toAbsolutePath().normalize();
        if (Files.isDirectory(fromRepo)) {
            return fromRepo;
        }
        throw new IllegalStateException("test-fixtures/workflow-topology directory not found");
    }

    private void runFixture(Path fixturePath) throws Exception {
        JsonNode root;
        try (InputStream input = Files.newInputStream(fixturePath)) {
            root = MAPPER.readTree(input);
        }

        WorkflowGraph graph = buildGraph(root.get("graph"));
        JsonNode expectations = root.get("expectations");

        assertJoinInbounds(graph, expectations.get("resolveJoinInbounds"));
        assertBranchPaths(graph, expectations.get("resolveBranchPaths"));
        assertLeafInbound(graph, expectations.get("isLeafInbound"));
        assertSpawnTree(graph, expectations.get("collectSpawnTree"));
    }

    private WorkflowGraph buildGraph(JsonNode graphNode) {
        Map<String, WorkflowTask> tasksById = new LinkedHashMap<>();
        JsonNode tasksNode = graphNode.get("tasks");
        Iterator<Map.Entry<String, JsonNode>> fields = tasksNode.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> entry = fields.next();
            WorkflowTask task = new WorkflowTask();
            task.setTaskId(entry.getKey());
            task.setType(TaskType.valueOf(entry.getValue().get("type").asText()));
            task.setParameters(parseParameters(task.getType(), entry.getValue().get("parameters")));
            tasksById.put(entry.getKey(), task);
        }

        Map<String, String> chainOut = new HashMap<>();
        JsonNode chainOutNode = graphNode.get("chainOut");
        if (chainOutNode != null && chainOutNode.isObject()) {
            chainOutNode.fields().forEachRemaining(entry -> chainOut.put(entry.getKey(), entry.getValue().asText()));
        }

        Map<String, List<String>> joinInbounds = new HashMap<>();
        JsonNode joinInboundsNode = graphNode.get("joinInbounds");
        if (joinInboundsNode != null && joinInboundsNode.isObject()) {
            joinInboundsNode.fields().forEachRemaining(entry -> {
                List<String> inboundIds = new ArrayList<>();
                entry.getValue().forEach(value -> inboundIds.add(value.asText()));
                joinInbounds.put(entry.getKey(), inboundIds);
            });
        }

        return new WorkflowGraph(tasksById, chainOut, joinInbounds);
    }

    private TaskParameters parseParameters(TaskType type, JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (!(node instanceof ObjectNode paramsNode)) {
            return null;
        }
        ObjectNode withType = paramsNode.deepCopy();
        withType.put("type", type.name());
        return MAPPER.convertValue(withType, TaskParameters.class);
    }

    private void assertJoinInbounds(WorkflowGraph graph, JsonNode node) {
        if (node == null) {
            return;
        }
        node.fields().forEachRemaining(entry -> {
            List<String> expected = new ArrayList<>();
            entry.getValue().forEach(value -> expected.add(value.asText()));
            assertEquals(expected, WorkflowTopologyResolver.resolveJoinInbounds(entry.getKey(), graph));
        });
    }

    private void assertBranchPaths(WorkflowGraph graph, JsonNode node) {
        if (node == null) {
            return;
        }
        node.fields().forEachRemaining(entry -> {
            List<WorkflowTopologyResolver.BranchPath> actual =
                    WorkflowTopologyResolver.resolveBranchPaths(entry.getKey(), graph);
            List<WorkflowTopologyResolver.BranchPath> expected = new ArrayList<>();
            entry.getValue().forEach(pathNode -> expected.add(new WorkflowTopologyResolver.BranchPath(
                    pathNode.get("branchIndex").asInt(),
                    pathNode.get("startTaskId").asText(),
                    pathNode.get("tipTaskId").asText())));

            assertEquals(expected, actual, "resolveBranchPaths for " + entry.getKey());
        });
    }

    private void assertLeafInbound(WorkflowGraph graph, JsonNode node) {
        if (node == null) {
            return;
        }
        node.fields().forEachRemaining(entry -> {
            String[] parts = entry.getKey().split(":", 2);
            boolean expected = entry.getValue().asBoolean();
            boolean actual = WorkflowTopologyResolver.isLeafInbound(parts[1], parts[0], graph);
            assertEquals(expected, actual, entry.getKey());
        });
    }

    private void assertSpawnTree(WorkflowGraph graph, JsonNode node) {
        if (node == null) {
            return;
        }
        node.fields().forEachRemaining(entry -> {
            Set<String> actual = WorkflowTopologyResolver.collectSpawnTree(entry.getKey(), graph);
            Set<String> expected = new java.util.LinkedHashSet<>();
            entry.getValue().forEach(value -> expected.add(value.asText()));
            assertEquals(expected, actual, "collectSpawnTree for " + entry.getKey());
        });
    }
}
