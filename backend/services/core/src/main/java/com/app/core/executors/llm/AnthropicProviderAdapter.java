package com.app.core.executors.llm;

import com.app.common.entity.LlmProviderType;
import com.app.core.model.llm.LlmRequestContext;
import com.app.core.model.llm.LlmResponse;
import com.app.core.model.llm.LlmStreamChunk;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpRequest;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class AnthropicProviderAdapter implements LlmProviderAdapter {

    private final ObjectMapper objectMapper;

    @Override
    public boolean supports(LlmProviderType type) {
        return type == LlmProviderType.ANTHROPIC;
    }

    @Override
    public HttpRequest buildRequest(LlmRequestContext ctx) throws Exception {
        ObjectNode requestBody = objectMapper.createObjectNode();
        requestBody.put("model", ctx.getModel());
        
        // Anthropic requires max_tokens
        requestBody.put("max_tokens", ctx.getMaxTokens() != null ? ctx.getMaxTokens() : 1024);
        
        if (ctx.getTemperature() != null) requestBody.put("temperature", ctx.getTemperature());
        requestBody.put("stream", ctx.isStream());

        StringBuilder systemPrompt = new StringBuilder();
        ArrayNode messagesArray = requestBody.putArray("messages");
        
        if (ctx.getMessages() != null) {
            for (ObjectNode msg : ctx.getMessages()) {
                String role = msg.has("role") ? msg.get("role").asText() : "";
                if ("system".equals(role)) {
                    systemPrompt.append(msg.get("content").asText()).append("\n");
                } else if ("user".equals(role) || "assistant".equals(role)) {
                    messagesArray.add(msg);
                } else if ("tool".equals(role)) {
                    // Translate tool result to Anthropic format (user role with tool_result content)
                    ObjectNode toolResultMsg = objectMapper.createObjectNode();
                    toolResultMsg.put("role", "user");
                    ArrayNode contentArr = toolResultMsg.putArray("content");
                    ObjectNode contentItem = contentArr.addObject();
                    contentItem.put("type", "tool_result");
                    contentItem.put("tool_use_id", msg.get("tool_call_id").asText());
                    contentItem.put("content", msg.get("content").asText());
                    messagesArray.add(toolResultMsg);
                }
            }
        }
        
        if (systemPrompt.length() > 0) {
            requestBody.put("system", systemPrompt.toString().trim());
        }

        if (ctx.getTools() != null && !ctx.getTools().isEmpty()) {
            ArrayNode toolsArray = requestBody.putArray("tools");
            for (ObjectNode oaiTool : ctx.getTools()) {
                if (oaiTool.has("function")) {
                    JsonNode func = oaiTool.get("function");
                    ObjectNode anthropicTool = toolsArray.addObject();
                    if (func.has("name")) anthropicTool.put("name", func.get("name").asText());
                    if (func.has("description")) anthropicTool.put("description", func.get("description").asText());
                    if (func.has("parameters")) anthropicTool.set("input_schema", func.get("parameters"));
                }
            }
        }

        String url = ctx.getBaseUrl();
        if (url == null || url.isEmpty()) {
            url = "https://api.anthropic.com/v1/messages";
        }

        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .header("x-api-key", ctx.getApiKey() != null ? ctx.getApiKey() : "")
                .header("anthropic-version", "2023-06-01")
                .timeout(Duration.ofMinutes(5));

        if (ctx.getExtraHeaders() != null) {
            ctx.getExtraHeaders().forEach(requestBuilder::header);
        }

        String reqJson = objectMapper.writeValueAsString(requestBody);
        return requestBuilder.POST(HttpRequest.BodyPublishers.ofString(reqJson)).build();
    }

    @Override
    public LlmResponse parseResponse(String body) throws Exception {
        JsonNode responseNode = objectMapper.readTree(body);
        
        Integer promptTokens = 0;
        Integer completionTokens = 0;
        if (responseNode.has("usage")) {
            JsonNode usageNode = responseNode.get("usage");
            if (usageNode.has("input_tokens")) promptTokens = usageNode.get("input_tokens").asInt();
            if (usageNode.has("output_tokens")) completionTokens = usageNode.get("output_tokens").asInt();
        }

        String finalGeneratedText = "";
        List<ObjectNode> tcs = new ArrayList<>();

        if (responseNode.has("content") && responseNode.get("content").isArray()) {
            for (JsonNode contentItem : responseNode.get("content")) {
                String type = contentItem.has("type") ? contentItem.get("type").asText() : "";
                if ("text".equals(type)) {
                    finalGeneratedText += contentItem.get("text").asText();
                } else if ("tool_use".equals(type)) {
                    ObjectNode tc = objectMapper.createObjectNode();
                    tc.put("id", contentItem.get("id").asText());
                    tc.put("type", "function");
                    ObjectNode func = tc.putObject("function");
                    func.put("name", contentItem.get("name").asText());
                    func.put("arguments", contentItem.has("input") ? contentItem.get("input").toString() : "{}");
                    tcs.add(tc);
                }
            }
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> raw = objectMapper.convertValue(responseNode, Map.class);

        return LlmResponse.builder()
                .generatedText(finalGeneratedText)
                .toolCalls(tcs)
                .promptTokens(promptTokens)
                .completionTokens(completionTokens)
                .rawResponseBody(raw)
                .build();
    }

    @Override
    public LlmStreamChunk parseStreamChunk(String line) throws Exception {
        if (!line.startsWith("data: ")) return null;
        String data = line.substring(6).trim();
        if (data.isEmpty() || data.equals("[DONE]")) return null;

        JsonNode chunk = objectMapper.readTree(data);
        String type = chunk.has("type") ? chunk.get("type").asText() : "";

        LlmStreamChunk.LlmStreamChunkBuilder builder = LlmStreamChunk.builder();
        
        if ("content_block_delta".equals(type) && chunk.has("delta")) {
            JsonNode delta = chunk.get("delta");
            if ("text_delta".equals(delta.get("type").asText())) {
                builder.text(delta.get("text").asText());
                return builder.build();
            } else if ("input_json_delta".equals(delta.get("type").asText())) {
                // For tools, partial json in streaming. The current agent loop executor expects 'arguments' string appended.
                List<ObjectNode> tcs = new ArrayList<>();
                ObjectNode tc = objectMapper.createObjectNode();
                tc.put("index", chunk.get("index").asInt());
                ObjectNode func = tc.putObject("function");
                func.put("arguments", delta.get("partial_json").asText());
                tcs.add(tc);
                builder.toolCalls(tcs);
                return builder.build();
            }
        } else if ("content_block_start".equals(type) && chunk.has("content_block")) {
            JsonNode block = chunk.get("content_block");
            if ("tool_use".equals(block.get("type").asText())) {
                List<ObjectNode> tcs = new ArrayList<>();
                ObjectNode tc = objectMapper.createObjectNode();
                tc.put("index", chunk.get("index").asInt());
                tc.put("id", block.get("id").asText());
                tc.put("type", "function");
                ObjectNode func = tc.putObject("function");
                func.put("name", block.get("name").asText());
                func.put("arguments", ""); // will be appended by deltas
                tcs.add(tc);
                builder.toolCalls(tcs);
                return builder.build();
            }
        }
        return null;
    }
}
