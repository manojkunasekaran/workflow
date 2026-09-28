package com.app.common.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

class DataTransformUtilsTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void stripJsonPaths_removesConfiguredFields() {
        Map<String, Object> body = Map.of(
                "status", "ok",
                "meta", Map.of("timestamp", "2024-01-01T00:00:00Z", "requestId", "req-1"));

        @SuppressWarnings("unchecked")
        Map<String, Object> stripped = (Map<String, Object>) DataTransformUtils.stripJsonPaths(
                body, List.of("$.meta.timestamp", "$.meta.requestId"));

        @SuppressWarnings("unchecked")
        Map<String, Object> meta = (Map<String, Object>) stripped.get("meta");
        assertEquals("ok", stripped.get("status"));
        assertEquals(0, meta.size());
    }

    @Test
    void canonicalJsonAndSha256_areStable() {
        Map<String, Object> body = Map.of("b", 2, "a", 1);
        String first = DataTransformUtils.sha256Hex(DataTransformUtils.canonicalJson(body, objectMapper));
        String second = DataTransformUtils.sha256Hex(DataTransformUtils.canonicalJson(body, objectMapper));
        assertEquals(first, second);
    }

    @Test
    void sha256Hex_differsForDifferentContent() {
        String first = DataTransformUtils.sha256Hex("alpha");
        String second = DataTransformUtils.sha256Hex("beta");
        assertNotEquals(first, second);
    }
}
