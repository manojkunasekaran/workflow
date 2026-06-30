package com.app.common.model.task.parameters;

/**
 * Defines the built-in utility operations available for the DATA_TRANSFORM
 * task.
 */
public enum TransformOperation {
    JSON_EXTRACT, // Extract data via JSONPath
    ARRAY_MAP, // Grab specific keys across a list of objects without flattening
    OBJECT_MERGE, // Deep-merge two JSON payloads together
    JSON_PARSE, // Convert a String into a structured associative Array/Map
    JSON_STRINGIFY, // Convert a dynamic Map/Array into a raw JSON string
    ARRAY_FILTER, // Keep only items in an array that match a condition
    ARRAY_FLATTEN, // Flatten an array of arrays into a single array
    DATE_FORMAT, // Reformat a timestamp or date string
    XML_TO_JSON, // Convert a raw XML string to a JSON object
    STRING_REPLACE, // Run regex or text replacement on a string
    CALCULATE_HASH // Generate MD5, SHA-256 etc hash of a string
}
