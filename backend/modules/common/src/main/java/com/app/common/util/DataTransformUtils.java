package com.app.common.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import com.jayway.jsonpath.DocumentContext;
import com.jayway.jsonpath.JsonPath;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Common utility class for performing standard data structure transformations.
 * These methods are stateless and decoupled from workflow execution contexts
 * to allow cross-module reuse.
 */
@Slf4j
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class DataTransformUtils {

    private static final ObjectMapper MUTABLE_COPY_MAPPER = new ObjectMapper();

    /**
     * Extracts a value from a JSON structure using a JSONPath expression.
     *
     * @param rawInput   The source object (e.g., Map, List, String) to extract
     *                   from.
     * @param expression The JSONPath string (e.g., "$.users[0].name").
     * @return The extracted value, or null if the path is not found.
     * @throws RuntimeException if the input cannot be parsed.
     */
    public static Object extractJsonPath(Object rawInput, String expression) {
        try {
            DocumentContext jsonContext = JsonPath.parse(rawInput);
            return jsonContext.read(expression);
        } catch (com.jayway.jsonpath.PathNotFoundException e) {
            log.debug("JSONPath '{}' not found in payload. Returning null.", expression);
            return null;
        } catch (IllegalArgumentException e) {
            throw new RuntimeException(
                    "Input data could not be parsed as a valid JSON structure for extraction: " + e.getMessage());
        }
    }

    /**
     * Creates a new list containing objects with only the specific keys extracted
     * from the original objects.
     *
     * @param rawInput   The source List of Maps to iterate over.
     * @param expression A comma-separated list of keys to extract (e.g.,
     *                   "id,name").
     * @return A new List of Maps containing only the requested keys.
     * @throws IllegalArgumentException if the input is not a List or contains
     *                                  non-Map items.
     */
    public static Object mapArrayKeys(Object rawInput, String expression) {
        if (!(rawInput instanceof List)) {
            throw new IllegalArgumentException("Input data for ARRAY_MAP must be a List/Array structure.");
        }

        String[] keysToMap = expression != null ? expression.split(",") : new String[0];

        if (keysToMap.length == 0 || expression.trim().isEmpty()) {
            return rawInput;
        }

        List<?> inputList = (List<?>) rawInput;
        List<Map<String, Object>> mappedList = new ArrayList<>();

        for (Object item : inputList) {
            if (item instanceof Map) {
                Map<?, ?> itemMap = (Map<?, ?>) item;
                Map<String, Object> newMappedItem = new HashMap<>();
                for (String key : keysToMap) {
                    if (key != null) {
                        String trimmedKey = key.trim();
                        if (itemMap.containsKey(trimmedKey)) {
                            newMappedItem.put(trimmedKey, itemMap.get(trimmedKey));
                        }
                    }
                }
                mappedList.add(newMappedItem);
            } else {
                throw new IllegalArgumentException(
                        "Items in the array must be objects (Maps) for ARRAY_MAP operation.");
            }
        }
        return mappedList;
    }

    /**
     * Merges two maps together. Keys in the merge data take precedence over base
     * input.
     *
     * @param baseInput The base Map object to merge into.
     * @param mergeData The Map object containing data to lay over the base object.
     * @return A new Map containing the merged elements.
     * @throws IllegalArgumentException if either argument is not a Map.
     */
    @SuppressWarnings("unchecked")
    public static Object mergeObjects(Object baseInput, Object mergeData) {
        if (!(baseInput instanceof Map)) {
            throw new IllegalArgumentException("Base input data for OBJECT_MERGE must be an Object (Map) structure.");
        }

        if (mergeData == null) {
            return baseInput;
        }

        if (!(mergeData instanceof Map)) {
            throw new IllegalArgumentException(
                    "Data to merge (resolved from expression) must be an Object (Map) structure.");
        }

        Map<String, Object> baseMap = new HashMap<>((Map<String, Object>) baseInput);
        Map<String, Object> mergeMap = (Map<String, Object>) mergeData;

        baseMap.putAll(mergeMap);
        return baseMap;
    }

    /**
     * Parses a string payload into a native Java Map or List.
     *
     * @param rawInput     The raw JSON string to parse.
     * @param objectMapper The Jackson ObjectMapper instance.
     * @return The parsed native Java Object (typically a Map or List).
     * @throws IllegalArgumentException if the input is not a String.
     * @throws RuntimeException         if parsing fails.
     */
    public static Object parseJsonString(Object rawInput, ObjectMapper objectMapper) {
        if (!(rawInput instanceof String)) {
            throw new IllegalArgumentException("Input data for JSON_PARSE must be a JSON String.");
        }
        try {
            String jsonStr = (String) rawInput;
            return objectMapper.readValue(jsonStr, Object.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse JSON string: " + e.getMessage(), e);
        }
    }

    /**
     * Serializes a native Java object into a raw JSON string.
     *
     * @param rawInput     The object to stringify.
     * @param objectMapper The Jackson ObjectMapper instance.
     * @return A serialized JSON representation of the input object.
     * @throws RuntimeException if stringification fails.
     */
    public static Object stringifyToJson(Object rawInput, ObjectMapper objectMapper) {
        try {
            return objectMapper.writeValueAsString(rawInput);
        } catch (Exception e) {
            throw new RuntimeException("Failed to stringify object: " + e.getMessage(), e);
        }
    }

    /**
     * Filters a list of objects based on a simple key-value matched expression.
     *
     * @param rawInput   The List of objects to filter.
     * @param expression The filter criteria in 'key=value' format.
     * @return A new List containing only elements that match the filter criteria.
     * @throws IllegalArgumentException if input is not a List or expression is
     *                                  malformed.
     */
    public static Object filterArrayElements(Object rawInput, String expression) {
        if (!(rawInput instanceof List)) {
            throw new IllegalArgumentException("Input data for ARRAY_FILTER must be a List/Array structure.");
        }
        if (expression == null || !expression.contains("=")) {
            throw new IllegalArgumentException("ARRAY_FILTER expression must be in 'key=value' format.");
        }

        String[] parts = expression.split("=", 2);
        String filterKey = parts[0].trim();
        String filterValue = parts[1].trim();

        List<?> inputList = (List<?>) rawInput;
        List<Map<String, Object>> filteredList = new ArrayList<>();

        for (Object item : inputList) {
            if (item instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> itemMap = (Map<String, Object>) item;
                if (itemMap.containsKey(filterKey)) {
                    Object val = itemMap.get(filterKey);
                    if (val != null && val.toString().equals(filterValue)) {
                        filteredList.add(itemMap);
                    }
                }
            }
        }
        return filteredList;
    }

    /**
     * Flattens a multi-dimensional nested List into a standard flat 1D List.
     *
     * @param rawInput The List of potentially nested elements to flatten.
     * @return A single-level flattened List.
     * @throws IllegalArgumentException if input is not a List.
     */
    public static Object flattenNestedArray(Object rawInput) {
        if (!(rawInput instanceof List)) {
            throw new IllegalArgumentException("Input data for ARRAY_FLATTEN must be a List/Array structure.");
        }

        List<?> inputList = (List<?>) rawInput;
        List<Object> flattenedList = new ArrayList<>();

        for (Object item : inputList) {
            if (item instanceof List) {
                flattenedList.addAll((List<?>) item);
            } else {
                flattenedList.add(item);
            }
        }
        return flattenedList;
    }

    /**
     * Converts a numeric epoch timestamp into an ISO-8601 string representation.
     *
     * @param rawInput The epoch timestamp (milliseconds usually).
     * @return ISO-8601 formatted date string.
     * @throws RuntimeException if input is not a valid epoch parsable number.
     */
    public static Object formatEpochDate(Object rawInput) {
        try {
            long epoch;
            if (rawInput instanceof Number) {
                epoch = ((Number) rawInput).longValue();
            } else {
                epoch = Long.parseLong(rawInput.toString());
            }
            return java.time.Instant.ofEpochMilli(epoch).toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to format date. Input must be an Epoch timestamp: " + e.getMessage());
        }
    }

    /**
     * Converts an XML string payload natively into a JSON-equivalent Map object.
     *
     * @param rawInput The raw XML string.
     * @return A map representation of the extracted XML payload.
     * @throws IllegalArgumentException if input string does not appear to be XML.
     */
    public static Object convertXmlToJson(Object rawInput) {
        if (!(rawInput instanceof String)) {
            throw new IllegalArgumentException("Input data for XML_TO_JSON must be an XML string.");
        }
        try {
            String xml = ((String) rawInput).trim();
            if (!xml.startsWith("<")) {
                throw new IllegalArgumentException("Provided string does not appear to be XML.");
            }
            XmlMapper xmlMapper = new XmlMapper();
            return xmlMapper.readValue(xml, Object.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse XML: " + e.getMessage(), e);
        }
    }

    /**
     * Performs regex replacement target-swaps across an entire string.
     *
     * @param rawInput   The source text string to modify.
     * @param expression The regex swap expression in the format of
     *                   'target_regex||replacement'.
     * @return The modified string.
     * @throws IllegalArgumentException if input is not a String or expression
     *                                  format is invalid.
     */
    public static Object replaceStringPattern(Object rawInput, String expression) {
        if (!(rawInput instanceof String)) {
            throw new IllegalArgumentException("Input data for STRING_REPLACE must be a String.");
        }
        if (expression == null || !expression.contains("||")) {
            throw new IllegalArgumentException(
                    "STRING_REPLACE expression must be formatted as 'regex||replacement'. Example: 'foo||bar'");
        }
        String[] parts = expression.split("\\|\\|", 2);
        return ((String) rawInput).replaceAll(parts[0], parts[1]);
    }

    /**
     * Generates a cryptographic hash for a given string payload.
     *
     * @param rawInput   The string to calculate the hash for.
     * @param expression The hashing algorithm (e.g., "MD5", defaults to "SHA-256").
     * @return The securely generated hexadecimal hash hash string.
     * @throws IllegalArgumentException if input is not a String.
     * @throws RuntimeException         if the requested hash algorithm is
     *                                  unavailable.
     */
    /**
     * Removes values at the given JsonPath expressions from a parsed JSON structure.
     * Missing paths are ignored.
     */
    public static Object stripJsonPaths(Object rawInput, List<String> paths) {
        if (rawInput == null || paths == null || paths.isEmpty()) {
            return rawInput;
        }
        try {
            // JsonPath deletes mutate in place; copy first so immutable inputs (e.g. Map.of) work.
            Object mutable = deepCopyToMutableStructure(rawInput);
            DocumentContext context = JsonPath.parse(mutable);
            for (String path : paths) {
                if (path == null || path.isBlank()) {
                    continue;
                }
                try {
                    context.delete(path);
                } catch (com.jayway.jsonpath.PathNotFoundException ignored) {
                    // path absent — nothing to strip
                }
            }
            return context.json();
        } catch (Exception e) {
            throw new RuntimeException("Failed to strip JsonPath fields: " + e.getMessage(), e);
        }
    }

    private static Object deepCopyToMutableStructure(Object rawInput) {
        try {
            byte[] json = MUTABLE_COPY_MAPPER.writeValueAsBytes(rawInput);
            return MUTABLE_COPY_MAPPER.readValue(json, Object.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to copy JSON for path stripping: " + e.getMessage(), e);
        }
    }

    /**
     * Serializes an object to canonical JSON (sorted map keys) for stable hashing.
     */
    public static String canonicalJson(Object rawInput, ObjectMapper objectMapper) {
        if (rawInput == null) {
            return "";
        }
        try {
            ObjectMapper sorted = objectMapper.copy()
                    .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
            return sorted.writeValueAsString(rawInput);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize canonical JSON: " + e.getMessage(), e);
        }
    }

    /**
     * Computes a SHA-256 hex digest of the given string.
     */
    public static String sha256Hex(String content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(content.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * hashBytes.length);
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to compute SHA-256 hash: " + e.getMessage(), e);
        }
    }

    public static Object calculateStringHash(Object rawInput, String expression) {
        if (!(rawInput instanceof String)) {
            throw new IllegalArgumentException("Input data for CALCULATE_HASH must be a String.");
        }
        String algorithm = (expression != null && expression.trim().equalsIgnoreCase("MD5")) ? "MD5" : "SHA-256";
        try {
            MessageDigest digest = MessageDigest.getInstance(algorithm);
            byte[] hashBytes = digest.digest(((String) rawInput).getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * hashBytes.length);
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to calculate hash (" + algorithm + "): " + e.getMessage(), e);
        }
    }
}
