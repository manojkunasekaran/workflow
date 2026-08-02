package com.app.common.model.task.execution;

import com.app.common.model.task.TaskType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Audit record stored after an SMTP_TASK execution.
 * Captures the resolved message details and delivery status.
 * Sensitive fields (password, full body) are intentionally omitted.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SmtpTaskExecutionData implements TaskExecutionData {

    /** Resolved "to" address(es). */
    private String to;

    /** Resolved "cc" address(es). */
    private String cc;

    /** Resolved subject line. */
    private String subject;

    /** SMTP host that was used. */
    private String smtpHost;

    /** SMTP port that was used. */
    private Integer smtpPort;

    /** From address that was used. */
    private String fromAddress;

    /** "SENT" or "FAILED". */
    private String status;

    /** Error detail if the send failed. */
    private String errorMessage;

    /** Timestamp when the send was attempted. */
    private Instant sentAt;

    @Override
    public String getTaskType() {
        return TaskType.SMTP_TASK.name();
    }

    @Override
    public Map<String, Object> toOutputMap() {
        Map<String, Object> output = new HashMap<>();
        output.put("to", to);
        output.put("cc", cc);
        output.put("subject", subject);
        output.put("smtpHost", smtpHost);
        output.put("smtpPort", smtpPort);
        output.put("fromAddress", fromAddress);
        output.put("status", status);
        output.put("sentAt", sentAt != null ? sentAt.toString() : null);
        if (errorMessage != null) {
            output.put("errorMessage", errorMessage);
        }
        return output;
    }
}
