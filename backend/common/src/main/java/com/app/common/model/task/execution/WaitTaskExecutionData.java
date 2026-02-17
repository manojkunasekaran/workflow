package com.app.common.model.task.execution;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import com.app.common.model.task.TaskType;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Captures WAIT task execution details for audit trail.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WaitTaskExecutionData implements TaskExecutionData {

    /** Configured duration in milliseconds. */
    private Long duration;

    /** Timestamp when the wait started. */
    private Instant waitStartTime;

    /** Timestamp when the wait ended. */
    private Instant waitEndTime;

    @Override
    public String getTaskType() {
        return TaskType.WAIT.name();
    }

    @Override
    public Map<String, Object> toOutputMap() {
        Map<String, Object> output = new HashMap<>();
        output.put("duration", duration);
        output.put("waitStartTime", waitStartTime != null ? waitStartTime.toString() : null);
        output.put("waitEndTime", waitEndTime != null ? waitEndTime.toString() : null);
        return output;
    }
}
