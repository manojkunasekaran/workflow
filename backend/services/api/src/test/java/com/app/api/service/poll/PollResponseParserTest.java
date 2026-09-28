package com.app.api.service.poll;

import com.app.common.model.trigger.ChangeDetectionConfig;
import com.app.common.model.trigger.UniqueKeyMode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class PollResponseParserTest {

    private PollResponseParser parser;

    @BeforeEach
    void setUp() {
        parser = new PollResponseParser(new ObjectMapper());
    }

    @Test
    void extractItemKey_usesFieldModeByDefault() {
        ChangeDetectionConfig detection = ChangeDetectionConfig.builder()
                .keyPaths(java.util.List.of("$.id"))
                .build();
        Map<String, Object> item = Map.of("id", "abc");

        assertEquals("abc", parser.extractItemKey(item, detection));
    }

    @Test
    void extractItemKey_contentHashMode_hashesWholeItem() {
        ChangeDetectionConfig detection = ChangeDetectionConfig.builder()
                .uniqueKeyMode(UniqueKeyMode.CONTENT_HASH)
                .build();
        Map<String, Object> item = Map.of("id", "1", "name", "alpha");

        String fingerprint = parser.extractItemKey(item, detection);
        assertNotNull(fingerprint);
        assertEquals(fingerprint, parser.extractItemKey(item, detection));
    }

    @Test
    void extractItemKey_contentHashMode_differsWhenContentChanges() {
        ChangeDetectionConfig detection = ChangeDetectionConfig.builder()
                .uniqueKeyMode(UniqueKeyMode.CONTENT_HASH)
                .build();

        String first = parser.extractItemKey(Map.of("id", "1", "name", "alpha"), detection);
        String second = parser.extractItemKey(Map.of("id", "1", "name", "beta"), detection);

        assertNotEquals(first, second);
    }

    @Test
    void extractItemKey_contentHashMode_usesSelectedPaths() {
        ChangeDetectionConfig detection = ChangeDetectionConfig.builder()
                .uniqueKeyMode(UniqueKeyMode.CONTENT_HASH)
                .contentHashPaths(java.util.List.of("$.name"))
                .build();

        String first = parser.extractItemKey(Map.of("id", "1", "name", "alpha"), detection);
        String second = parser.extractItemKey(Map.of("id", "2", "name", "alpha"), detection);

        assertEquals(first, second);
    }

    @Test
    void extractItemTimestamp_parsesIsoInstant() {
        ChangeDetectionConfig detection = ChangeDetectionConfig.builder()
                .timestampPath("$.updatedAt")
                .build();
        Map<String, Object> item = new HashMap<>();
        item.put("updatedAt", "2024-06-15T10:00:00Z");

        assertEquals(Instant.parse("2024-06-15T10:00:00Z"), parser.extractItemTimestamp(item, detection));
    }

    @Test
    void extractItemTimestamp_returnsNullWhenPathMissing() {
        assertNull(parser.extractItemTimestamp(Map.of("id", "1"), ChangeDetectionConfig.builder().build()));
    }
}
