package com.app.common.model.task.parameters;

import lombok.Data;

@Data
public class ScriptTaskParameters implements TaskParameters {
    /**
     * JavaScript code to execute
     */
    private String script;

    /**
     * Language/variant (for future: "javascript", "python")
     * Default: "javascript"
     */
    private String language = "javascript";

    /**
     * Optional: Timeout in ms. If set, overrides the environment default.
     */
    private Long timeoutMs;

    /**
     * Optional: Max memory in MB. If set, overrides the environment default.
     */
    private Integer maxMemoryMb;
}
