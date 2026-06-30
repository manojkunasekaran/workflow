package com.app.common.model.task;

import lombok.Data;

/**
 * A user-defined action for a human task.
 * Different action configurations create different task behaviors (manual,
 * approval, etc.)
 * without any code changes.
 *
 * Examples:
 * - Manual task: { id: "done", label: "Mark as Done", outcome: APPROVED }
 * - Approval task: { id: "approve", label: "Approve", outcome: APPROVED }
 * { id: "reject", label: "Reject", outcome: REJECTED }
 * { id: "needs_info", label: "Needs More Info", outcome: PENDING }
 */
@Data
public class HumanTaskAction {
    private String id;
    private String label;
    private HumanTaskOutcome outcome;

    /**
     * Optional: override the default next task routing for this specific action.
     * If null, uses the default approvedNextTaskId or rejectedNextTaskId from
     * HumanTaskParameters.
     */
    private String nextTaskId;
}
