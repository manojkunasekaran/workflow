package com.app.common.model.task.execution;

import com.app.common.model.task.TaskType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Audit record stored after a DB_TASK execution.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DbTaskExecutionData implements TaskExecutionData {
    private String operation;
    private String table;
    private String resolvedQuery;
    private List<Map<String, Object>> rows;
    private Object firstRow;
    private Integer rowsAffected;
    private Object generatedKey;
    private Long durationMs;
    private String status;
    private String errorMessage;

    @Override
    public String getTaskType() {
        return TaskType.DB_TASK.name();
    }

    @Override
    public Map<String, Object> toOutputMap() {
        Map<String, Object> output = new HashMap<>();
        output.put("rows", rows);
        output.put("firstRow", firstRow);
        output.put("rowsAffected", rowsAffected);
        output.put("generatedKey", generatedKey);
        output.put("durationMs", durationMs);
        output.put("status", status);
        output.put("resolvedQuery", resolvedQuery);
        return output;
    }
}
