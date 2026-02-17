package com.app.common.model.task.execution;

import com.app.common.model.task.HumanTaskAction;
import com.app.common.model.task.HumanTaskOutcome;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Execution data recorded for a HUMAN_TASK.
 * Captures both the task configuration snapshot and the human's response.
 */
@Data
@Builder
public class HumanTaskExecutionData implements TaskExecutionData {

    /** Title of the human task */
    private String title;

    /** Who was assigned this task */
    private String assignee;

    /** Snapshot of the available actions at execution time */
    private List<HumanTaskAction> availableActions;

    /**
     * Current outcome of the human task:
     * - null (initial/TODO state, before any human interaction)
     * - PENDING (human responded with a non-terminal action, e.g., "Needs More
     * Info")
     * - APPROVED (human approved — task COMPLETED, workflow resumes)
     * - REJECTED (human rejected — task FAILED, workflow resumes or takes rejection
     * path)
     */
    private HumanTaskOutcome currentOutcome;

    /** Which action the human selected (action ID) */
    private String actionTaken;

    /** Who actually responded */
    private String respondedBy;

    /** When the response was submitted */
    private Instant respondedAt;

    /** Data submitted with the response (future: form data) */
    @Builder.Default
    private Map<String, Object> formData = new HashMap<>();

    @Override
    public String getTaskType() {
        return "HUMAN_TASK";
    }

    @Override
    public Map<String, Object> toOutputMap() {
        Map<String, Object> output = new HashMap<>();
        output.put("title", title);
        output.put("assignee", assignee);
        output.put("actionTaken", actionTaken);
        output.put("outcome", currentOutcome != null ? currentOutcome.name() : null);
        output.put("respondedBy", respondedBy);
        output.put("respondedAt", respondedAt != null ? respondedAt.toString() : null);
        if (formData != null && !formData.isEmpty()) {
            output.put("formData", formData);
        }
        return output;
    }
}
