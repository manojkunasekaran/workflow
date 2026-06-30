package com.app.api.dto;

import lombok.Data;

import java.util.Map;

/**
 * Request body for responding to a human task.
 */
@Data
public class HumanTaskResponse {
    /**
     * Which action was selected (must match an action ID from the task's configured
     * actions)
     */
    private String actionId;

    /** Who is responding to this task */
    private String respondedBy;

    /** Optional: form data submitted with the response (future use) */
    private Map<String, Object> formData;
}
