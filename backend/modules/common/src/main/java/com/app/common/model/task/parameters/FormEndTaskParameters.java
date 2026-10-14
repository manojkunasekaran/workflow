package com.app.common.model.task.parameters;

import lombok.Data;

@Data
public class FormEndTaskParameters implements TaskParameters {
    public enum EndType {
        MESSAGE,
        REDIRECT,
        CUSTOM_HTML
    }

    private EndType endType;
    private String message;
    private String redirectUrl;
    /** Sanitized HTML snippet */
    private String customHtml;
    /** When true, workflow continues after form UX ends; when false, mark execution completed if no more work */
    private boolean continueWorkflowAfterEnd;
}
