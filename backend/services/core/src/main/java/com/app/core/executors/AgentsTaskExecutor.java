package com.app.core.executors;

import com.app.common.entity.IntegrationCredential;
import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.AgentsTaskExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.AgentsTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.service.CredentialProvider;
import com.app.core.service.TaskExecutor;
import com.app.core.service.VariableResolver;
import com.app.execution.events.ExecutionEvent;
import com.app.execution.events.ExecutionEventPublisher;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.context.annotation.Lazy;

@Slf4j
@Component
@RequiredArgsConstructor
public class AgentsTaskExecutor implements TaskExecutor {

    private final CredentialProvider credentialProvider;
    private final VariableResolver variableResolver;
    private final ObjectMapper objectMapper;
    private final ExecutionEventPublisher eventPublisher;
    
    @org.springframework.beans.factory.annotation.Autowired
    @Lazy
    private com.app.core.service.WorkflowEngine workflowEngine;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Override
    public boolean canExecute(TaskType taskType) {
        return TaskType.AGENTS_TASK == taskType;
    }

    @Override
    public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
        log.info("Starting execution of AGENTS Task: {}", task.getTaskId());

        if (!(task.getParameters() instanceof AgentsTaskParameters params)) {
            throw new IllegalArgumentException("Invalid parameters for AGENTS task");
        }

        String providerUrl = resolveString(params.getProviderUrl(), "https://api.openai.com/v1/chat/completions", context);
        String model = resolveString(params.getModel(), "gpt-3.5-turbo", context);
        String systemPrompt = resolveString(params.getSystemPrompt(), "", context);
        String userPrompt = resolveString(params.getUserPrompt(), "", context);

        String token = resolveToken(params.getCredentialId(), context);

        List<ObjectNode> messages = new ArrayList<>();
        if (!systemPrompt.isEmpty()) {
            messages.add(createMessage("system", systemPrompt));
        }
        if (!userPrompt.isEmpty()) {
            messages.add(createMessage("user", userPrompt));
        }

        int maxLoops = 10;
        int loopCount = 0;
        
        Integer promptTokens = 0;
        Integer completionTokens = 0;
        String finalGeneratedText = "";
        Map<String, Object> lastResponseBody = null;

        while (loopCount < maxLoops) {
            loopCount++;
            
            ObjectNode requestBody = objectMapper.createObjectNode();
            requestBody.put("model", model);
            ArrayNode messagesArray = requestBody.putArray("messages");
            messages.forEach(messagesArray::add);

            if (params.getTemperature() != null) requestBody.put("temperature", params.getTemperature());
            if (params.getMaxTokens() != null) requestBody.put("max_tokens", params.getMaxTokens());
            
            if (params.getTools() != null && !params.getTools().isEmpty()) {
                ArrayNode toolsArray = requestBody.putArray("tools");
                for (AgentsTaskParameters.AgentTool toolDef : params.getTools()) {
                    ObjectNode toolNode = toolsArray.addObject();
                    toolNode.put("type", "function");
                    ObjectNode functionNode = toolNode.putObject("function");
                    functionNode.put("name", toolDef.getName());
                    functionNode.put("description", toolDef.getDescription() != null ? toolDef.getDescription() : "");
                    boolean hasSchema = toolDef.getInputSchema() != null && !toolDef.getInputSchema().isEmpty();
                    WorkflowTask targetTask = toolDef.getTargetTaskId() != null ? context.getWorkflowDefinition().getTasks().stream()
                            .filter(t -> t.getTaskId().equals(toolDef.getTargetTaskId()))
                            .findFirst()
                            .orElse(null) : null;

                    if (!hasSchema && targetTask != null) {
                        try {
                            String targetParamsJson = objectMapper.writeValueAsString(targetTask.getParameters());
                            java.util.regex.Pattern p = java.util.regex.Pattern.compile("\\{\\{\\$" + java.util.regex.Pattern.quote(toolDef.getTargetTaskId()) + "\\.([a-zA-Z0-9_\\-]+)\\}\\}");
                            java.util.regex.Matcher m = p.matcher(targetParamsJson);
                            ObjectNode propertiesNode = objectMapper.createObjectNode();
                            ArrayNode requiredNode = objectMapper.createArrayNode();
                            while (m.find()) {
                                String varName = m.group(1);
                                if (!propertiesNode.has(varName)) {
                                    propertiesNode.set(varName, objectMapper.createObjectNode().put("type", "string"));
                                    requiredNode.add(varName);
                                }
                            }
                            ObjectNode schemaNode = objectMapper.createObjectNode().put("type", "object");
                            schemaNode.set("properties", propertiesNode);
                            if (requiredNode.size() > 0) {
                                schemaNode.set("required", requiredNode);
                            }
                            functionNode.set("parameters", schemaNode);
                        } catch (Exception e) {
                            log.warn("Failed to generate schema for tool {}", toolDef.getName(), e);
                            functionNode.set("parameters", objectMapper.createObjectNode().put("type", "object"));
                        }
                    } else if (hasSchema) {
                        functionNode.set("parameters", objectMapper.valueToTree(toolDef.getInputSchema()));
                    } else {
                        functionNode.set("parameters", objectMapper.createObjectNode().put("type", "object"));
                    }
                }
            }

            boolean isStream = Boolean.TRUE.equals(params.getStream());
            requestBody.put("stream", isStream);

            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(providerUrl))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofMinutes(5));
            
            if (token != null) {
                requestBuilder.header("Authorization", "Bearer " + token);
            }

            try {
                String reqJson = objectMapper.writeValueAsString(requestBody);
                HttpRequest request = requestBuilder.POST(HttpRequest.BodyPublishers.ofString(reqJson)).build();

                if (isStream) {
                    HttpResponse<java.util.stream.Stream<String>> response = httpClient.send(request, HttpResponse.BodyHandlers.ofLines());
                    
                    StringBuilder accumulatedText = new StringBuilder();
                    List<ObjectNode> toolCalls = new ArrayList<>();
                    
                    response.body().forEach(line -> {
                        if (line.startsWith("data: ") && !line.equals("data: [DONE]")) {
                            try {
                                JsonNode chunk = objectMapper.readTree(line.substring(6));
                                if (chunk.has("choices") && chunk.get("choices").isArray() && chunk.get("choices").size() > 0) {
                                    JsonNode delta = chunk.get("choices").get(0).get("delta");
                                    if (delta != null) {
                                        if (delta.has("content") && !delta.get("content").isNull()) {
                                            String content = delta.get("content").asText();
                                            accumulatedText.append(content);
                                            eventPublisher.publish(ExecutionEvent.chunk(execution.getId(), task.getTaskId(), content));
                                        }
                                        if (delta.has("tool_calls")) {
                                            ArrayNode tcs = (ArrayNode) delta.get("tool_calls");
                                            for (JsonNode tcDelta : tcs) {
                                                int index = tcDelta.get("index").asInt();
                                                while (toolCalls.size() <= index) {
                                                    toolCalls.add(objectMapper.createObjectNode());
                                                }
                                                ObjectNode tc = toolCalls.get(index);
                                                if (tcDelta.has("id") && !tcDelta.get("id").isNull()) tc.put("id", tcDelta.get("id").asText());
                                                if (tcDelta.has("type") && !tcDelta.get("type").isNull()) tc.put("type", tcDelta.get("type").asText());
                                                if (tcDelta.has("function")) {
                                                    if (!tc.has("function")) tc.set("function", objectMapper.createObjectNode());
                                                    ObjectNode func = (ObjectNode) tc.get("function");
                                                    JsonNode funcDelta = tcDelta.get("function");
                                                    if (funcDelta.has("name") && !funcDelta.get("name").isNull()) func.put("name", funcDelta.get("name").asText());
                                                    if (funcDelta.has("arguments") && !funcDelta.get("arguments").isNull()) {
                                                        String args = func.has("arguments") ? func.get("arguments").asText() : "";
                                                        func.put("arguments", args + funcDelta.get("arguments").asText());
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            } catch (Exception e) {
                                log.warn("Error parsing SSE chunk: {}", e.getMessage());
                            }
                        }
                    });
                    
                    if (!toolCalls.isEmpty()) {
                        ObjectNode assistantMsg = objectMapper.createObjectNode();
                        assistantMsg.put("role", "assistant");
                        if (accumulatedText.length() > 0) assistantMsg.put("content", accumulatedText.toString());
                        ArrayNode tca = assistantMsg.putArray("tool_calls");
                        toolCalls.forEach(tca::add);
                        messages.add(assistantMsg);
                        
                        boolean executedAny = executeTools(toolCalls, params.getTools(), execution, context, messages);
                        if (!executedAny) break;
                    } else {
                        finalGeneratedText = accumulatedText.toString();
                        break;
                    }
                } else {
                    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                    JsonNode responseNode = objectMapper.readTree(response.body());
                    lastResponseBody = objectMapper.convertValue(responseNode, Map.class);
                    
                    if (responseNode.has("usage")) {
                        JsonNode usageNode = responseNode.get("usage");
                        if (usageNode.has("prompt_tokens")) promptTokens += usageNode.get("prompt_tokens").asInt();
                        if (usageNode.has("completion_tokens")) completionTokens += usageNode.get("completion_tokens").asInt();
                    }

                    if (responseNode.has("choices") && responseNode.get("choices").isArray() && responseNode.get("choices").size() > 0) {
                        JsonNode choice = responseNode.get("choices").get(0);
                        JsonNode messageNode = choice.get("message");
                        
                        String finishReason = choice.has("finish_reason") ? choice.get("finish_reason").asText() : "";
                        
                        if ("tool_calls".equals(finishReason) || (messageNode != null && messageNode.has("tool_calls"))) {
                            messages.add((ObjectNode) messageNode);
                            List<ObjectNode> tcs = new ArrayList<>();
                            if (messageNode.has("tool_calls")) {
                                messageNode.get("tool_calls").forEach(tc -> tcs.add((ObjectNode) tc));
                            }
                            boolean executedAny = executeTools(tcs, params.getTools(), execution, context, messages);
                            if (!executedAny) break;
                        } else {
                            if (messageNode != null && messageNode.has("content") && !messageNode.get("content").isNull()) {
                                finalGeneratedText = messageNode.get("content").asText();
                            }
                            break;
                        }
                    } else {
                        break;
                    }
                }
            } catch (Exception e) {
                log.error("AGENTS request failed: {}", e.getMessage(), e);
                return TaskExecutionResult.builder()
                        .status(TaskExecutionResult.Status.FAILED)
                        .errorMessage("AGENTS request failed: " + e.getMessage())
                        .build();
            }
        }

        AgentsTaskExecutionData executionData = AgentsTaskExecutionData.builder()
                .modelUsed(model)
                .promptTokens(promptTokens)
                .completionTokens(completionTokens)
                .totalTokens(promptTokens + completionTokens)
                .responseBody(lastResponseBody)
                .generatedText(finalGeneratedText)
                .build();

        return TaskExecutionResult.builder()
                .status(TaskExecutionResult.Status.COMPLETED)
                .executionData(executionData)
                .output(buildOutput(executionData))
                .build();
    }

    private boolean executeTools(List<ObjectNode> toolCalls, List<AgentsTaskParameters.AgentTool> toolsDef, 
                               WorkflowExecution execution, ExecutionContext context, List<ObjectNode> messages) {
        if (toolsDef == null || toolsDef.isEmpty()) return false;
        
        boolean executedAny = false;
        for (ObjectNode tc : toolCalls) {
            String toolCallId = tc.get("id").asText();
            ObjectNode func = (ObjectNode) tc.get("function");
            String name = func.get("name").asText();
            String arguments = func.has("arguments") ? func.get("arguments").asText() : "{}";
            
            AgentsTaskParameters.AgentTool tool = toolsDef.stream().filter(t -> t.getName().equals(name)).findFirst().orElse(null);
            
            String toolOutput = "";
            if (tool != null && tool.getTargetTaskId() != null) {
                try {
                    WorkflowTask targetTask = context.getWorkflowDefinition().getTasks().stream()
                            .filter(t -> t.getTaskId().equals(tool.getTargetTaskId()))
                            .findFirst()
                            .orElse(null);
                            
                    if (targetTask != null) {
                        Map<String, Object> parsedArgs = objectMapper.readValue(arguments, Map.class);
                        // Inject into task outputs safely without clearing
                        context.getTaskOutputs().put(targetTask.getTaskId(), parsedArgs);
                        
                        TaskExecutionResult result = workflowEngine.executeSubTask(targetTask, execution, context);
                        if (result.getStatus() == TaskExecutionResult.Status.FAILED) {
                            toolOutput = "Error: " + result.getErrorMessage();
                        } else if (result.getOutput() != null) {
                            toolOutput = objectMapper.writeValueAsString(result.getOutput());
                        } else {
                            toolOutput = "Task completed successfully with no output.";
                        }
                    } else {
                        toolOutput = "Error: Target task " + tool.getTargetTaskId() + " not found.";
                    }
                } catch (Exception e) {
                    log.error("Failed to execute tool {}: {}", name, e.getMessage());
                    toolOutput = "Error: " + e.getMessage();
                }
            } else {
                toolOutput = "Error: Tool definition or target task not found.";
            }
            
            ObjectNode toolMessage = objectMapper.createObjectNode();
            toolMessage.put("role", "tool");
            toolMessage.put("tool_call_id", toolCallId);
            toolMessage.put("content", toolOutput);
            messages.add(toolMessage);
            executedAny = true;
        }
        return executedAny;
    }

    private ObjectNode createMessage(String role, String content) {
        ObjectNode msg = objectMapper.createObjectNode();
        msg.put("role", role);
        msg.put("content", content);
        return msg;
    }

    private String resolveString(String value, String defaultVal, ExecutionContext context) {
        if (value == null || value.isEmpty()) return defaultVal;
        return variableResolver.resolveString(value, context);
    }

    private String resolveToken(String credentialId, ExecutionContext context) {
        if (credentialId != null && !credentialId.isEmpty()) {
            String resolvedCredentialId = variableResolver.resolveString(credentialId, context);
            Optional<IntegrationCredential> credentialOpt = credentialProvider.resolveCredential(resolvedCredentialId, null, context);
            if (credentialOpt.isPresent()) {
                Map<String, String> creds = credentialOpt.get().getCredentials();
                if (creds != null) {
                    return creds.containsKey("token") ? creds.get("token") : creds.get("api_key");
                }
            }
        }
        return null;
    }
}
