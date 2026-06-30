package com.app.common.model.task.parameters;

import lombok.Data;

/**
 * Parameters for the native DATA_TRANSFORM utility task execution.
 */
@Data
public class DataTransformTaskParameters implements TaskParameters {

    /**
     * The utility operation to perform.
     * Default: JSON_EXTRACT (Extract data via JSONPath)
     */
    private TransformOperation operation = TransformOperation.JSON_EXTRACT;

    /**
     * The source data payload to perform the transformation on.
     * Often an expression like {{$tasks.fetch_users.body}}
     */
    private Object inputData;

    /**
     * The query expression for the extraction operation.
     * e.g., "$.users[?(@.active==true)].email"
     */
    private String expression;
}
