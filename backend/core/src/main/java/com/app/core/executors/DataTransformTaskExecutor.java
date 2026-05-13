package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.DataTransformExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.DataTransformTaskParameters;
import com.app.common.util.DataTransformUtils;
import com.app.core.model.ExecutionContext;
import com.app.core.service.TaskExecutor;
import com.app.core.service.VariableResolver;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Executes data transformations (like JSONPath extraction).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataTransformTaskExecutor implements TaskExecutor {

    private final VariableResolver variableResolver;
    private final ObjectMapper objectMapper;

    @Override
    public boolean canExecute(TaskType taskType) {
        return TaskType.DATA_TRANSFORM == taskType;
    }

    @Override
    public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
        DataTransformTaskParameters params = (DataTransformTaskParameters) task.getParameters();
        log.info("Executing Data Transform task: {} with operation {}", task.getTaskId(), params.getOperation());

        try {
            // 1. Resolve the variables of this task input
            Object rawInput = variableResolver.resolveValue(params.getInputData(), context);

            Object transformedResult = null;

            if (rawInput == null) {
                log.debug("Input data resolved to null for task {}. Skipping operation {}.", task.getTaskId(),
                        params.getOperation());
            } else {
                // 2. Route to the correct native utility operation
                switch (params.getOperation()) {
                    case JSON_EXTRACT:
                        transformedResult = DataTransformUtils.extractJsonPath(rawInput, params.getExpression());
                        break;
                    case ARRAY_MAP:
                        transformedResult = DataTransformUtils.mapArrayKeys(rawInput, params.getExpression());
                        break;
                    case OBJECT_MERGE:
                        transformedResult = executeObjectMerge(rawInput, params, context);
                        break;
                    case JSON_PARSE:
                        transformedResult = DataTransformUtils.parseJsonString(rawInput, objectMapper);
                        break;
                    case JSON_STRINGIFY:
                        transformedResult = DataTransformUtils.stringifyToJson(rawInput, objectMapper);
                        break;
                    case ARRAY_FILTER:
                        transformedResult = DataTransformUtils.filterArrayElements(rawInput, params.getExpression());
                        break;
                    case ARRAY_FLATTEN:
                        transformedResult = DataTransformUtils.flattenNestedArray(rawInput);
                        break;
                    case DATE_FORMAT:
                        transformedResult = DataTransformUtils.formatEpochDate(rawInput);
                        break;
                    case XML_TO_JSON:
                        transformedResult = DataTransformUtils.convertXmlToJson(rawInput);
                        break;
                    case STRING_REPLACE:
                        transformedResult = DataTransformUtils.replaceStringPattern(rawInput, params.getExpression());
                        break;
                    case CALCULATE_HASH:
                        transformedResult = DataTransformUtils.calculateStringHash(rawInput, params.getExpression());
                        break;
                    default:
                        throw new UnsupportedOperationException(
                                "Transform operation " + params.getOperation() + " is not yet implemented.");
                }
            }

            // 3. Return the exact shaped result back to the Workflow Context memory
            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.COMPLETED)
                    .output(Map.of("result", transformedResult != null ? transformedResult : Map.of()))
                    .executionData(DataTransformExecutionData.builder()
                            .operation(params.getOperation().name())
                            .expression(params.getExpression())
                            .result(transformedResult)
                            .build())
                    .build();

        } catch (Exception e) {
            log.error("Data Transformation failed for task {}: {}", task.getTaskId(), e.getMessage(), e);
            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.FAILED)
                    .errorMessage("Data transformation failed: " + e.getMessage())
                    .executionData(DataTransformExecutionData.builder()
                            .operation(params.getOperation().name())
                            .expression(params.getExpression())
                            .error(e.getClass().getSimpleName() + ": " + e.getMessage())
                            .build())
                    .build();
        }
    }

    private Object executeObjectMerge(Object rawInput, DataTransformTaskParameters params, ExecutionContext context) {
        // Special logic here, Object Merge expression is usually another task output
        // `{{...}}`
        // So we must resolve the second argument through VariableResolver before
        // sending to Utils
        Object mergeData = params.getExpression() != null && !params.getExpression().trim().isEmpty()
                ? variableResolver.resolveValue(params.getExpression(), context)
                : null;
        return DataTransformUtils.mergeObjects(rawInput, mergeData);
    }
}
