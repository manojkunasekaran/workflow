package com.app.common.connector;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class ConnectorAction {
    private String actionId;
    private String displayName;
    private String description;
    private String method;
    private String path;
    private List<String> pathParams;
    private List<ConnectorInputField> inputSchema;
    private Map<String, String> fixedHeaders;
    private Map<String, Object> fixedBody;
    private String outputDescription;
    private List<String> outputPaths;

    /**
     * Generic Javascript (GraalVM) expression evaluated before sending the HTTP request.
     * Use this to map human-friendly UI inputs into complex API payloads.
     * The script has access to $inputs (resolved parameters) and must return a JSON object
     * representing the final HTTP body, or null if no body is needed.
     */
    private String inputScript;

    /**
     * Maximum number of retry attempts on transient failures (5xx, 429).
     * Null means use the platform default (3 attempts).
     * Set to 0 to disable retries for this action entirely.
     */
    private Integer maxRetries;

    /**
     * Initial delay in milliseconds for the first retry backoff.
     * Subsequent retries use exponential backoff (doubled each attempt).
     * Null means use the platform default (1000ms).
     */
    private Integer retryDelayMs;
}

