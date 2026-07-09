package com.app.common.model.task.parameters;

import com.app.common.model.task.HumanTaskAction;
import com.app.common.model.task.TaskRefs;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Parameters for a HUMAN_TASK.
 * Fully configurable — different action configurations create different
 * behaviors:
 *
 * Manual task: single APPROVED action ("Mark as Done")
 * Approval task: APPROVED + REJECTED + optional PENDING actions
 * Form task: any actions + formSchema for collecting data (future)
 */
@Data
public class HumanTaskParameters implements TaskParameters {

    /** Title shown to the assignee */
    private String title;

    /** Detailed description of what needs to be done */
    private String description;

    /** Who should handle this task (user ID, team name, email, etc.) */
    private String assignee;

    /** Available actions the human can take — defines the task behavior */
    private List<HumanTaskAction> actions;

    /** Default next task when action outcome is APPROVED (null → sequential) */
    private String approvedNextTaskId;

    public void setApprovedNextTaskId(String approvedNextTaskId) {
        this.approvedNextTaskId = TaskRefs.normalize(approvedNextTaskId);
    }

    /**
     * Default next task when action outcome is REJECTED (null → fail the workflow)
     */
    private String rejectedNextTaskId;

    public void setRejectedNextTaskId(String rejectedNextTaskId) {
        this.rejectedNextTaskId = TaskRefs.normalize(rejectedNextTaskId);
    }

    /**
     * Optional: form schema for collecting structured data from the human (future)
     */
    private Map<String, Object> formSchema;

    // TODO: private String timeoutDuration; // Auto-reject after timeout
    // TODO: private String notificationChannel; // Email, Slack, etc.
}
