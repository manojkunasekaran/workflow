package com.app.api.dto;

import lombok.Data;
import java.util.Map;

/**
 * Request body for the connector test endpoint.
 * Allows callers to test any connector action with a live API call.
 */
@Data
public class ConnectorTestRequest {
    /** The action within the connector to test (e.g. "post_message"). */
    private String actionId;

    /** ID of the credential to use for authentication. */
    private String credentialId;

    /**
     * The input values for the action's inputSchema fields.
     * These may contain literal values; expression variables are NOT resolved
     * (test calls are standalone and have no execution context).
     */
    private Map<String, Object> inputs;
}
