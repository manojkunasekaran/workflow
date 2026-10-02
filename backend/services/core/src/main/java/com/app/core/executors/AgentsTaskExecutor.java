package com.app.core.executors;

import com.app.common.entity.IntegrationCredential;
import com.app.common.entity.WorkflowExecution;
import com.app.common.model.mcp.McpToolDescriptor;
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
import com.app.capability.mcp.api.McpToolDiscoveryService;
import com.app.capability.mcp.api.McpToolInvoker;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.app.core.executors.llm.LlmProviderAdapter;
import com.app.core.model.llm.LlmRequestContext;
import com.app.core.model.llm.LlmResponse;
import com.app.core.model.llm.LlmStreamChunk;
import com.app.common.entity.LlmProviderType;


import org.springframework.context.annotation.Lazy;

@Slf4j
@Component
@RequiredArgsConstructor
public class AgentsTaskExecutor implements TaskExecutor {

    private final CredentialProvider credentialProvider;
    private final VariableResolver variableResolver;
    private final ObjectMapper objectMapper;
    private final ExecutionEventPublisher eventPublisher;
    private final List<LlmProviderAdapter> adapters;
    private final McpToolDiscoveryService mcpToolDiscoveryService;
    private final McpToolInvoker mcpToolInvoker;
    
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

        String providerUrl = resolveString(params.getProviderUrl(), null, context);
        String model = resolveString(params.getModel(), "gpt-3.5-turbo", context);
        String systemPrompt = resolveString(params.getSystemPrompt(), "", context);
        String userPrompt = resolveString(params.getUserPrompt(), "", context);

        IntegrationCredential credential = resolveLlmCredential(params.getCredentialId(), context);
        
        LlmProviderType providerType = LlmProviderType.OPENAI;
        String baseUrl = providerUrl;
        Map<String, String> extraHeaders = null;
        String apiKey = null;
        
        if (credential != null) {
            Map<String, String> creds = credential.getCredentials();
            if (creds != null) {
                apiKey = creds.containsKey("token") ? creds.get("token") : creds.get("apiKey");
                // Check multiple possible key names
                if (apiKey == null && creds.containsKey("api_key")) apiKey = creds.get("api_key");
            }
            
            String cId = credential.getConnectorId();
            if (cId != null) {
                switch(cId) {
                    case "anthropic":
                        providerType = LlmProviderType.ANTHROPIC;
                        if (baseUrl == null || baseUrl.isEmpty()) baseUrl = "https://api.anthropic.com/v1";
                        break;
                    case "gemini":
                        providerType = LlmProviderType.GEMINI;
                        if (baseUrl == null || baseUrl.isEmpty()) baseUrl = "https://generativelanguage.googleapis.com/v1beta";
                        break;
                    case "openai":
                    case "groq":
                    case "mistral":
                        providerType = LlmProviderType.OPENAI;
                        if (baseUrl == null || baseUrl.isEmpty()) {
                            if (cId.equals("groq")) baseUrl = "https://api.groq.com/openai/v1";
                            else if (cId.equals("mistral")) baseUrl = "https://api.mistral.ai/v1";
                            else baseUrl = "https://api.openai.com/v1";
                        }
                        break;
                    case "azure_openai":
                        providerType = LlmProviderType.OPENAI; // Uses same payload shape
                        String azureBaseUrl = creds != null ? creds.get("baseUrl") : null;
                        if (azureBaseUrl != null && !azureBaseUrl.isEmpty() && (baseUrl == null || baseUrl.isEmpty())) baseUrl = azureBaseUrl;
                        if (extraHeaders == null) extraHeaders = new HashMap<>();
                        if (apiKey != null) extraHeaders.put("api-key", apiKey);
                        break;
                }
            }
        }

        if (baseUrl == null || baseUrl.isEmpty()) {
            baseUrl = "https://api.openai.com/v1";
        }

        final LlmProviderType finalProviderType = providerType;
        LlmProviderAdapter adapter = adapters.stream().filter(a -> a.supports(finalProviderType)).findFirst()
                .orElseThrow(() -> new IllegalStateException("No adapter found for provider type " + finalProviderType));

        List<ObjectNode> messages = new ArrayList<>();
        if (!systemPrompt.isEmpty()) {
            messages.add(createMessage("system", systemPrompt));
        }
        if (!userPrompt.isEmpty()) {
            messages.add(createMessage("user", userPrompt));
        }
        
        McpPrefetchedContext mcpContext = prefetchMcpTools(params, context);
        List<ObjectNode> shapedTools = new ArrayList<>();
        if (params.getTools() != null && !params.getTools().isEmpty()) {
            for (AgentsTaskParameters.AgentTool toolDef : params.getTools()) {
                ObjectNode toolNode = objectMapper.createObjectNode();
                toolNode.put("type", "function");
                ObjectNode functionNode = toolNode.putObject("function");

                if (AgentsTaskParameters.isMcpTool(toolDef)) {
                    String credentialName = mcpContext.credentialName(toolDef.getCredentialId());
                    functionNode.put("name", AgentsTaskParameters.resolveLlmToolName(toolDef, credentialName));
                    Optional<McpToolDescriptor> remoteTool = mcpContext.findRemoteTool(
                            toolDef.getCredentialId(), toolDef.getRemoteToolName());
                    if (remoteTool.isPresent()) {
                        McpToolDescriptor descriptor = remoteTool.get();
                        String description = toolDef.getDescription() != null && !toolDef.getDescription().isBlank()
                                ? toolDef.getDescription()
                                : (descriptor.getDescription() != null ? descriptor.getDescription() : "");
                        functionNode.put("description", description);
                        if (descriptor.getInputSchema() != null && !descriptor.getInputSchema().isEmpty()) {
                            functionNode.set("parameters", objectMapper.valueToTree(descriptor.getInputSchema()));
                        } else {
                            functionNode.set("parameters", objectMapper.createObjectNode().put("type", "object"));
                        }
                    } else {
                        log.warn("MCP tool {} not found for credential {}", toolDef.getRemoteToolName(), toolDef.getCredentialId());
                        functionNode.put("description", toolDef.getDescription() != null ? toolDef.getDescription() : "");
                        functionNode.set("parameters", objectMapper.createObjectNode().put("type", "object"));
                    }
                    shapedTools.add(toolNode);
                    continue;
                }

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
                shapedTools.add(toolNode);
            }
        }

        int maxLoops = params.getMaxLoops() != null ? params.getMaxLoops() : 10;
        if ("SINGLE_CALL".equals(params.getAgentMode())) {
            maxLoops = 1;
        }
        int loopCount = 0;
        int[] mcpCallCount = new int[]{0};
        boolean pendingToolContinuation = false;

        Integer promptTokens = 0;
        Integer completionTokens = 0;
        String finalGeneratedText = "";
        Map<String, Object> lastResponseBody = null;
        boolean isStream = Boolean.TRUE.equals(params.getStream());

        while (loopCount < maxLoops) {
            loopCount++;

            LlmRequestContext ctx = LlmRequestContext.builder()
                    .baseUrl(baseUrl)
                    .model(model)
                    .messages(messages)
                    .tools(shapedTools)
                    .temperature(params.getTemperature())
                    .maxTokens(params.getMaxTokens())
                    .stream(isStream)
                    .apiKey(apiKey)
                    .extraHeaders(extraHeaders)
                    .build();

            try {
                HttpRequest request = adapter.buildRequest(ctx);

                if (isStream) {
                    HttpResponse<java.util.stream.Stream<String>> response = httpClient.send(request, HttpResponse.BodyHandlers.ofLines());
                    
                    StringBuilder accumulatedText = new StringBuilder();
                    List<ObjectNode> toolCalls = new ArrayList<>();
                    
                    response.body().forEach(line -> {
                        try {
                            LlmStreamChunk chunk = adapter.parseStreamChunk(line);
                            if (chunk != null) {
                                if (chunk.getText() != null) {
                                    accumulatedText.append(chunk.getText());
                                    eventPublisher.publish(ExecutionEvent.chunk(execution.getId(), task.getTaskId(), chunk.getText()));
                                }
                                if (chunk.getToolCalls() != null) {
                                    for (ObjectNode tcDelta : chunk.getToolCalls()) {
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
                        } catch (Exception e) {
                            log.warn("Error parsing SSE chunk: {}", e.getMessage());
                        }
                    });
                    
                    if (!toolCalls.isEmpty()) {
                        ObjectNode assistantMsg = objectMapper.createObjectNode();
                        assistantMsg.put("role", "assistant");
                        if (accumulatedText.length() > 0) assistantMsg.put("content", accumulatedText.toString());
                        ArrayNode tca = assistantMsg.putArray("tool_calls");
                        toolCalls.forEach(tca::add);
                        messages.add(assistantMsg);
                        
                        boolean executedAny = executeTools(toolCalls, params.getTools(), execution, context, messages, mcpContext, mcpCallCount);
                        if (!executedAny) {
                            pendingToolContinuation = false;
                            break;
                        }
                        pendingToolContinuation = true;
                    } else {
                        pendingToolContinuation = false;
                        finalGeneratedText = accumulatedText.toString();
                        break;
                    }
                } else {
                    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                    LlmResponse llmResponse = adapter.parseResponse(response.body());
                    lastResponseBody = llmResponse.getRawResponseBody();
                    
                    if (llmResponse.getPromptTokens() != null) promptTokens += llmResponse.getPromptTokens();
                    if (llmResponse.getCompletionTokens() != null) completionTokens += llmResponse.getCompletionTokens();

                    if (llmResponse.getToolCalls() != null && !llmResponse.getToolCalls().isEmpty()) {
                        ObjectNode assistantMsg = objectMapper.createObjectNode();
                        assistantMsg.put("role", "assistant");
                        if (llmResponse.getGeneratedText() != null && !llmResponse.getGeneratedText().isEmpty()) {
                            assistantMsg.put("content", llmResponse.getGeneratedText());
                        }
                        ArrayNode tca = assistantMsg.putArray("tool_calls");
                        llmResponse.getToolCalls().forEach(tca::add);
                        messages.add(assistantMsg);

                        boolean executedAny = executeTools(llmResponse.getToolCalls(), params.getTools(), execution, context, messages, mcpContext, mcpCallCount);
                        if (!executedAny) {
                            pendingToolContinuation = false;
                            break;
                        }
                        pendingToolContinuation = true;
                    } else {
                        pendingToolContinuation = false;
                        finalGeneratedText = llmResponse.getGeneratedText();
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

        boolean loopExhausted = pendingToolContinuation && loopCount >= maxLoops;
        String warning = loopExhausted
                ? "Agent loop limit (" + maxLoops + ") reached while the model requested additional tool calls"
                : null;

        AgentsTaskExecutionData executionData = AgentsTaskExecutionData.builder()
                .modelUsed(model)
                .promptTokens(promptTokens)
                .completionTokens(completionTokens)
                .totalTokens(promptTokens + completionTokens)
                .responseBody(lastResponseBody)
                .generatedText(finalGeneratedText)
                .loopExhausted(loopExhausted)
                .warning(warning)
                .build();

        return TaskExecutionResult.builder()
                .status(TaskExecutionResult.Status.COMPLETED)
                .executionData(executionData)
                .output(buildOutput(executionData))
                .build();
    }

    private boolean executeTools(List<ObjectNode> toolCalls, List<AgentsTaskParameters.AgentTool> toolsDef,
                               WorkflowExecution execution, ExecutionContext context, List<ObjectNode> messages,
                               McpPrefetchedContext mcpContext, int[] mcpCallCount) {
        if (toolsDef == null || toolsDef.isEmpty()) return false;
        
        boolean executedAny = false;
        for (ObjectNode tc : toolCalls) {
            String toolCallId = tc.has("id") ? tc.get("id").asText() : "call_" + System.currentTimeMillis();
            ObjectNode func = (ObjectNode) tc.get("function");
            String name = func.get("name").asText();
            String arguments = func.has("arguments") ? func.get("arguments").asText() : "{}";
            
            AgentsTaskParameters.AgentTool tool = findToolByLlmName(toolsDef, name, mcpContext);
            
            String toolOutput = "";
            if (tool != null && AgentsTaskParameters.isMcpTool(tool)) {
                if (mcpCallCount[0] >= mcpContext.maxToolCallsPerRun()) {
                    toolOutput = "Error: Maximum MCP tool calls per run exceeded.";
                } else {
                    mcpCallCount[0]++;
                    try {
                        IntegrationCredential mcpCredential = mcpContext.credential(tool.getCredentialId());
                        if (mcpCredential == null) {
                            toolOutput = "Error: MCP credential " + tool.getCredentialId() + " not found.";
                        } else if (tool.getRemoteToolName() == null || tool.getRemoteToolName().isBlank()) {
                            toolOutput = "Error: MCP tool remoteToolName is required.";
                        } else {
                            Map<String, Object> parsedArgs = objectMapper.readValue(arguments, Map.class);
                            var result = mcpToolInvoker.callTool(
                                    mcpCredential,
                                    mcpCredential.getCredentials(),
                                    tool.getRemoteToolName(),
                                    parsedArgs,
                                    mcpContext.toolCallTimeoutSeconds());
                            toolOutput = objectMapper.writeValueAsString(result);
                        }
                    } catch (Exception e) {
                        log.error("Failed to execute MCP tool {}: {}", name, e.getMessage());
                        toolOutput = "Error: " + e.getMessage();
                    }
                }
            } else if (tool != null && tool.getTargetTaskId() != null) {
                try {
                    WorkflowTask targetTask = context.getWorkflowDefinition().getTasks().stream()
                            .filter(t -> t.getTaskId().equals(tool.getTargetTaskId()))
                            .findFirst()
                            .orElse(null);
                            
                    if (targetTask != null) {
                        Map<String, Object> parsedArgs = objectMapper.readValue(arguments, Map.class);
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

    private IntegrationCredential resolveLlmCredential(String credentialId, ExecutionContext context) {
        if (credentialId != null && !credentialId.isEmpty()) {
            String resolvedCredentialId = variableResolver.resolveString(credentialId, context);
            Optional<IntegrationCredential> credentialOpt = credentialProvider.resolveCredential(resolvedCredentialId, null, context);
            return credentialOpt.orElse(null);
        }
        return null;
    }

    private McpPrefetchedContext prefetchMcpTools(AgentsTaskParameters params, ExecutionContext context) {
        Map<String, IntegrationCredential> credentialsById = new HashMap<>();
        Map<String, List<McpToolDescriptor>> toolsByCredentialId = new HashMap<>();

        if (params.getTools() != null) {
            for (AgentsTaskParameters.AgentTool tool : params.getTools()) {
                if (!AgentsTaskParameters.isMcpTool(tool)) {
                    continue;
                }
                String credentialId = tool.getCredentialId();
                if (credentialId == null || credentialId.isBlank() || credentialsById.containsKey(credentialId)) {
                    continue;
                }
                String resolvedCredentialId = variableResolver.resolveString(credentialId, context);
                Optional<IntegrationCredential> credentialOpt = credentialProvider.resolveCredential(resolvedCredentialId, null, context);
                if (credentialOpt.isEmpty()) {
                    log.warn("MCP credential {} could not be resolved for prefetch", credentialId);
                    continue;
                }
                IntegrationCredential credential = credentialOpt.get();
                credentialsById.put(credentialId, credential);
                try {
                    toolsByCredentialId.put(
                            credentialId,
                            mcpToolDiscoveryService.listTools(credential, credential.getCredentials()));
                } catch (Exception e) {
                    log.warn("Failed to prefetch MCP tools for credential {}", credentialId, e);
                    toolsByCredentialId.put(credentialId, List.of());
                }
            }
        }

        return new McpPrefetchedContext(
                credentialsById,
                toolsByCredentialId,
                params.mcpToolCallTimeoutSecondsOrDefault(),
                params.maxMcpToolCallsPerRunOrDefault());
    }

    private AgentsTaskParameters.AgentTool findToolByLlmName(
            List<AgentsTaskParameters.AgentTool> toolsDef,
            String llmName,
            McpPrefetchedContext mcpContext) {
        return toolsDef.stream()
                .filter(tool -> {
                    String credentialName = AgentsTaskParameters.isMcpTool(tool)
                            ? mcpContext.credentialName(tool.getCredentialId())
                            : null;
                    return AgentsTaskParameters.resolveLlmToolName(tool, credentialName).equals(llmName);
                })
                .findFirst()
                .orElse(null);
    }

    private record McpPrefetchedContext(
            Map<String, IntegrationCredential> credentialsById,
            Map<String, List<McpToolDescriptor>> toolsByCredentialId,
            int toolCallTimeoutSeconds,
            int maxToolCallsPerRun) {

        String credentialName(String credentialId) {
            IntegrationCredential credential = credentialsById.get(credentialId);
            return credential != null ? credential.getName() : "mcp";
        }

        IntegrationCredential credential(String credentialId) {
            return credentialsById.get(credentialId);
        }

        Optional<McpToolDescriptor> findRemoteTool(String credentialId, String remoteToolName) {
            if (remoteToolName == null || remoteToolName.isBlank()) {
                return Optional.empty();
            }
            return toolsByCredentialId.getOrDefault(credentialId, List.of()).stream()
                    .filter(tool -> remoteToolName.equals(tool.getName()))
                    .findFirst();
        }
    }
}
