package com.app.common.model.task.parameters;

import lombok.Data;
import java.util.List;
import java.util.Map;

/**
 * Parameters for a DB_TASK node.
 */
@Data
public class DbTaskParameters implements TaskParameters {
    private String credentialId;
    private String operation;
    private String table;
    private String query;
    private List<DbQueryParameter> parameters;
    private String conditions;
    private List<DbQueryParameter> conditionParameters;
    private Map<String, Object> values;
    private Integer limit = 100;
    private Integer queryTimeout = 30;
    private String returnMode = "ALL_ROWS";

    @Data
    public static class DbQueryParameter {
        private String key;
        private Object value;
    }
}
