package com.app.api.service.poll;

import com.app.common.model.trigger.ChangeDetectionConfig;
import com.app.common.model.trigger.UniqueKeyMode;
import com.app.common.util.DataTransformUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Parses poll HTTP responses and extracts item arrays via JsonPath.
 */
@Component
@RequiredArgsConstructor
public class PollResponseParser {

    private final ObjectMapper objectMapper;

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> extractItems(Object body, ChangeDetectionConfig detection) {
        if (body == null) {
            return Collections.emptyList();
        }

        Object items;
        if (detection != null && detection.getItemsPath() != null && !detection.getItemsPath().isBlank()) {
            items = DataTransformUtils.extractJsonPath(body, detection.getItemsPath());
        } else if (body instanceof List) {
            items = body;
        } else {
            return Collections.emptyList();
        }

        if (items == null) {
            return Collections.emptyList();
        }
        if (!(items instanceof List<?> rawList)) {
            return Collections.emptyList();
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Object element : rawList) {
            if (element instanceof Map<?, ?> map) {
                result.add((Map<String, Object>) map);
            }
        }
        return result;
    }

    public String extractItemKey(Map<String, Object> item, ChangeDetectionConfig detection) {
        if (detection != null && detection.getUniqueKeyMode() == UniqueKeyMode.CONTENT_HASH) {
            return computeContentFingerprint(item, detection);
        }

        if (detection != null && detection.getKeyPaths() != null && !detection.getKeyPaths().isEmpty()) {
            StringBuilder key = new StringBuilder();
            for (String path : detection.getKeyPaths()) {
                Object value = DataTransformUtils.extractJsonPath(item, path);
                if (value != null) {
                    if (key.length() > 0) {
                        key.append(':');
                    }
                    key.append(value);
                }
            }
            if (key.length() > 0) {
                return key.toString();
            }
        }
        Object id = item.get("id");
        return id != null ? id.toString() : null;
    }

    public String extractUpdateKey(Map<String, Object> item, ChangeDetectionConfig detection) {
        if (detection == null || detection.getUpdateKeyPath() == null || detection.getUpdateKeyPath().isBlank()) {
            return null;
        }
        Object value = DataTransformUtils.extractJsonPath(item, detection.getUpdateKeyPath());
        return value != null ? value.toString() : null;
    }

    public Instant extractItemTimestamp(Map<String, Object> item, ChangeDetectionConfig detection) {
        if (detection == null || detection.getTimestampPath() == null || detection.getTimestampPath().isBlank()) {
            return null;
        }
        Object value = DataTransformUtils.extractJsonPath(item, detection.getTimestampPath());
        return parseTimestamp(value);
    }

    private Instant parseTimestamp(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            long epoch = number.longValue();
            if (epoch > 1_000_000_000_000L) {
                return Instant.ofEpochMilli(epoch);
            }
            return Instant.ofEpochSecond(epoch);
        }
        try {
            return Instant.parse(value.toString());
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    String computeContentFingerprint(Map<String, Object> item, ChangeDetectionConfig detection) {
        Object toHash = item;
        if (detection.getContentHashPaths() != null && !detection.getContentHashPaths().isEmpty()) {
            Map<String, Object> subset = new HashMap<>();
            for (String path : detection.getContentHashPaths()) {
                Object value = DataTransformUtils.extractJsonPath(item, path);
                if (value != null) {
                    subset.put(path, value);
                }
            }
            toHash = subset;
        }
        String canonical = DataTransformUtils.canonicalJson(toHash, objectMapper);
        return DataTransformUtils.sha256Hex(canonical);
    }
}
