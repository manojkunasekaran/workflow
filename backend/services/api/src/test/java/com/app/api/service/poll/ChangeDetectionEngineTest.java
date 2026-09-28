package com.app.api.service.poll;

import com.app.common.entity.TriggerPollState;
import com.app.common.model.trigger.ChangeDetectionConfig;
import com.app.common.model.trigger.PollConfig;
import com.app.common.model.trigger.PollEpoch;
import com.app.common.model.trigger.PollEventSemantics;
import com.app.common.model.trigger.UniqueKeyMode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ChangeDetectionEngineTest {

    private ChangeDetectionEngine engine;
    private PollResponseParser parser;

    @BeforeEach
    void setUp() {
        parser = new PollResponseParser(new ObjectMapper());
        engine = new ChangeDetectionEngine(
                new NewItemsStrategy(),
                new UpdatedItemsStrategy(),
                new NewOrUpdatedStrategy(),
                new ResponseChangedStrategy(new ObjectMapper()),
                parser);
    }

    @Test
    void newItemsStrategy_detectsUnseenItems() {
        PollConfig poll = PollConfig.builder()
                .semantics(PollEventSemantics.NEW_ITEMS)
                .epoch(PollEpoch.NOW)
                .build();
        TriggerPollState state = emptyState();
        state.setBaselineEstablished(true);

        List<Map<String, Object>> items = List.of(item("1", "a"), item("2", "b"));
        ChangeDetectionResult result = engine.detect(poll, state, items, "[]", items, 1000);

        assertEquals(2, result.getItemsNew());
        assertEquals(2, result.getTriggerItems().size());
    }

    @Test
    void newItemsStrategy_seedsBaselineOnFirstPoll() {
        PollConfig poll = PollConfig.builder()
                .semantics(PollEventSemantics.NEW_ITEMS)
                .epoch(PollEpoch.ALL)
                .build();
        TriggerPollState state = emptyState();

        List<Map<String, Object>> items = List.of(item("1", "a"));
        ChangeDetectionResult result = engine.detect(poll, state, items, "[]", items, 1000);

        assertEquals(0, result.getItemsNew());
        assertTrue(state.isBaselineEstablished());
    }

    @Test
    void newItemsStrategy_skipsKnownItems() {
        PollConfig poll = PollConfig.builder()
                .semantics(PollEventSemantics.NEW_ITEMS)
                .epoch(PollEpoch.ALL)
                .build();
        TriggerPollState state = stateWithSeen("1");

        List<Map<String, Object>> items = List.of(item("1", "a"), item("2", "b"));
        ChangeDetectionResult result = engine.detect(poll, state, items, "[]", items, 1000);

        assertEquals(1, result.getItemsNew());
        assertEquals("2", result.getTriggerItems().get(0).get("id"));
    }

    @Test
    void updatedStrategy_detectsChangedUpdateKey() {
        PollConfig poll = PollConfig.builder()
                .semantics(PollEventSemantics.UPDATED)
                .epoch(PollEpoch.ALL)
                .detection(ChangeDetectionConfig.builder()
                        .updateKeyPath("version")
                        .build())
                .build();
        TriggerPollState state = stateWithSeenUpdate("1", "v1");
        state.setBaselineEstablished(true);

        List<Map<String, Object>> items = List.of(itemWithVersion("1", "v2"));
        ChangeDetectionResult result = engine.detect(poll, state, items, "[]", items, 1000);

        assertEquals(1, result.getItemsUpdated());
        assertEquals(1, result.getTriggerItems().size());
    }

    @Test
    void newOrUpdatedStrategy_detectsNewAndUpdated() {
        PollConfig poll = PollConfig.builder()
                .semantics(PollEventSemantics.NEW_OR_UPDATED)
                .epoch(PollEpoch.ALL)
                .detection(ChangeDetectionConfig.builder()
                        .updateKeyPath("version")
                        .build())
                .build();
        TriggerPollState state = stateWithSeenUpdate("1", "v1");
        state.setBaselineEstablished(true);

        List<Map<String, Object>> items = List.of(
                itemWithVersion("1", "v2"),
                itemWithVersion("2", "v1"));
        ChangeDetectionResult result = engine.detect(poll, state, items, "[]", items, 1000);

        assertEquals(2, result.getTriggerItems().size());
    }

    @Test
    void responseChangedStrategy_ignoresConfiguredPaths() {
        PollConfig poll = PollConfig.builder()
                .semantics(PollEventSemantics.RESPONSE_CHANGED)
                .epoch(PollEpoch.ALL)
                .detection(ChangeDetectionConfig.builder()
                        .hashIgnorePaths(List.of("$.timestamp"))
                        .build())
                .build();
        TriggerPollState state = emptyState();
        state.setBaselineEstablished(true);

        String bodyWithTs1 = "{\"status\":\"ok\",\"timestamp\":\"2024-01-01T00:00:00Z\"}";
        ChangeDetectionResult first = engine.detect(
                poll, state, List.of(), bodyWithTs1, Map.of("status", "ok", "timestamp", "2024-01-01T00:00:00Z"), 1000);

        String bodyWithTs2 = "{\"status\":\"ok\",\"timestamp\":\"2024-01-02T00:00:00Z\"}";
        ChangeDetectionResult second = engine.detect(
                poll, state, List.of(), bodyWithTs2, Map.of("status", "ok", "timestamp", "2024-01-02T00:00:00Z"), 1000);

        assertEquals(false, second.isResponseChanged());
        assertEquals(first.getResponseHash(), second.getResponseHash());
    }

    @Test
    void newItemsStrategy_contentHashMode_detectsChangedFingerprint() {
        PollConfig poll = PollConfig.builder()
                .semantics(PollEventSemantics.NEW_ITEMS)
                .epoch(PollEpoch.ALL)
                .detection(ChangeDetectionConfig.builder()
                        .uniqueKeyMode(UniqueKeyMode.CONTENT_HASH)
                        .build())
                .build();
        TriggerPollState state = stateWithSeen(
                parser.extractItemKey(item("1", "alpha"), poll.getDetection()));
        state.setBaselineEstablished(true);

        List<Map<String, Object>> items = List.of(item("1", "beta"));
        ChangeDetectionResult result = engine.detect(poll, state, items, "[]", items, 1000);

        assertEquals(1, result.getItemsNew());
    }

    @Test
    void newItemsStrategy_fromDate_seedsOldItems() {
        PollConfig poll = PollConfig.builder()
                .semantics(PollEventSemantics.NEW_ITEMS)
                .epoch(PollEpoch.FROM_DATE)
                .epochDate("2024-06-01T00:00:00Z")
                .detection(ChangeDetectionConfig.builder()
                        .timestampPath("$.updatedAt")
                        .build())
                .build();
        TriggerPollState state = emptyState();
        state.setBaselineEstablished(true);

        Map<String, Object> oldItem = new HashMap<>();
        oldItem.put("id", "old");
        oldItem.put("updatedAt", "2024-01-01T00:00:00Z");
        Map<String, Object> newItem = new HashMap<>();
        newItem.put("id", "new");
        newItem.put("updatedAt", "2024-07-01T00:00:00Z");

        ChangeDetectionResult result = engine.detect(
                poll, state, List.of(oldItem, newItem), "[]", List.of(oldItem, newItem), 1000);

        assertEquals(1, result.getItemsNew());
        assertEquals("new", result.getTriggerItems().get(0).get("id"));
    }

    @Test
    void responseChangedStrategy_detectsHashChange() {
        PollConfig poll = PollConfig.builder()
                .semantics(PollEventSemantics.RESPONSE_CHANGED)
                .epoch(PollEpoch.ALL)
                .build();
        TriggerPollState state = emptyState();
        state.setLastResponseHash("oldhash");
        state.setBaselineEstablished(true);

        String body = "{\"status\":\"changed\"}";
        ChangeDetectionResult result = engine.detect(
                poll, state, List.of(), body, Map.of("status", "changed"), 1000);

        assertTrue(result.isResponseChanged());
        assertEquals(state.getLastResponseHash(), result.getResponseHash());
    }

    private TriggerPollState emptyState() {
        return TriggerPollState.builder()
                .seenKeys(new ArrayList<>())
                .baselineEstablished(false)
                .build();
    }

    private TriggerPollState stateWithSeen(String key) {
        TriggerPollState state = emptyState();
        state.setBaselineEstablished(true);
        state.getSeenKeys().add(TriggerPollState.SeenKey.builder().key(key).build());
        return state;
    }

    private TriggerPollState stateWithSeenUpdate(String itemKey, String version) {
        TriggerPollState state = emptyState();
        state.setBaselineEstablished(true);
        state.getSeenKeys().add(TriggerPollState.SeenKey.builder()
                .key(itemKey + "::" + version)
                .build());
        return state;
    }

    private Map<String, Object> item(String id, String name) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", id);
        map.put("name", name);
        return map;
    }

    private Map<String, Object> itemWithVersion(String id, String version) {
        Map<String, Object> map = item(id, "x");
        map.put("version", version);
        return map;
    }
}
