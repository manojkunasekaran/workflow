package com.app.api.service.mcp;

import com.app.api.config.properties.WorkflowApiProperties;
import com.app.api.dto.McpToolCallResponse;
import com.app.api.service.WorkflowExecutionService;
import com.app.common.constant.ExecutionType;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.entity.WorkflowExecution;
import com.app.common.exception.ValidationException;
import com.app.common.model.trigger.McpResponseMode;
import com.app.common.model.trigger.McpTriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.common.model.variable.VariableType;
import com.app.common.model.variable.VariableValue;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class McpToolInvocationService {

    private final WorkflowExecutionService executionService;
    private final WorkflowApiProperties apiProperties;

    public McpToolCallResponse invoke(McpToolCatalogService.ResolvedMcpTool resolved, Map<String, Object> arguments) {
        WorkflowDefinition definition = resolved.definition();
        McpTriggerConfig mcp = definition.getTrigger().getMcp();
        Map<String, VariableValue> inputs = convertArguments(arguments, definition.getInputs());

        if (mcp.getResponseMode() == McpResponseMode.TASK_OUTPUT) {
            return invokeSync(definition, mcp, inputs);
        }
        return invokeAsync(definition, mcp, inputs);
    }

    private McpToolCallResponse invokeAsync(
            WorkflowDefinition definition, McpTriggerConfig mcp, Map<String, VariableValue> inputs) {
        WorkflowExecution execution = executionService.triggerExecution(
                definition.getId(), inputs, ExecutionType.ASYNC, TriggerType.MCP);

        return McpToolCallResponse.builder()
                .executionId(execution.getId())
                .responseMode(McpResponseMode.EXECUTION_ID.name())
                .build();
    }

    private McpToolCallResponse invokeSync(
            WorkflowDefinition definition, McpTriggerConfig mcp, Map<String, VariableValue> inputs) {
        if (mcp.getResponseTaskId() == null || mcp.getResponseTaskId().isBlank()) {
            throw new ValidationException("MCP trigger TASK_OUTPUT mode requires responseTaskId");
        }

        long timeoutSeconds = mcp.getWaitTimeoutSeconds() != null
                ? mcp.getWaitTimeoutSeconds()
                : apiProperties.getExecution().getSyncTimeoutSeconds();

        WorkflowExecution completed = executionService.triggerSyncExecutionWithTimeout(
                definition.getId(), inputs, TriggerType.MCP, timeoutSeconds);

        Object result = completed.getTaskOutputs() != null
                ? completed.getTaskOutputs().get(mcp.getResponseTaskId())
                : null;

        return McpToolCallResponse.builder()
                .executionId(completed.getId())
                .result(result)
                .responseMode(McpResponseMode.TASK_OUTPUT.name())
                .build();
    }

    private Map<String, VariableValue> convertArguments(
            Map<String, Object> arguments, List<WorkflowDefinition.WorkflowInput> schema) {
        Map<String, Object> payload = arguments != null ? arguments : Map.of();
        Set<String> allowed = new HashSet<>();
        if (schema != null) {
            for (WorkflowDefinition.WorkflowInput input : schema) {
                if (input.getName() != null) {
                    allowed.add(input.getName());
                }
            }
        }

        Map<String, VariableValue> inputs = new HashMap<>();
        for (Map.Entry<String, Object> entry : payload.entrySet()) {
            if (!allowed.isEmpty() && !allowed.contains(entry.getKey())) {
                throw new ValidationException("Unknown MCP tool argument: " + entry.getKey());
            }
            inputs.put(entry.getKey(), toVariableValue(entry.getKey(), entry.getValue()));
        }
        return inputs;
    }

    private VariableValue toVariableValue(String name, Object value) {
        VariableType type;
        if (value instanceof String) {
            type = VariableType.STRING;
        } else if (value instanceof Number) {
            type = VariableType.NUMBER;
        } else if (value instanceof Boolean) {
            type = VariableType.BOOLEAN;
        } else if (value instanceof List) {
            type = VariableType.ARRAY;
        } else {
            type = VariableType.OBJECT;
        }
        return VariableValue.builder().name(name).type(type).value(value).build();
    }
}
