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
public class OpenAiProviderAdapter implements LlmProviderAdapter {

    private final ObjectMapper objectMapper;

    @Override
    public boolean supports(LlmProviderType type) {
        return type == LlmProviderType.OPENAI || type == LlmProviderType.CUSTOM;
    }

    @Override
    public HttpRequest buildRequest(LlmRequestContext ctx) throws Exception {
        ObjectNode requestBody = objectMapper.createObjectNode();
        requestBody.put("model", ctx.getModel());
        
        ArrayNode messagesArray = requestBody.putArray("messages");
        if (ctx.getMessages() != null) {
            ctx.getMessages().forEach(messagesArray::add);
        }

        if (ctx.getTemperature() != null) requestBody.put("temperature", ctx.getTemperature());
        if (ctx.getMaxTokens() != null) requestBody.put("max_tokens", ctx.getMaxTokens());
        requestBody.put("stream", ctx.isStream());

        if (ctx.getTools() != null && !ctx.getTools().isEmpty()) {
            ArrayNode toolsArray = requestBody.putArray("tools");
            ctx.getTools().forEach(toolsArray::add);
        }

        String url = ctx.getBaseUrl();
        if (url == null || url.isEmpty()) {
            url = "https://api.openai.com/v1/chat/completions";
        }

        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofMinutes(5));

        if (ctx.getApiKey() != null && !ctx.getApiKey().isEmpty()) {
            requestBuilder.header("Authorization", "Bearer " + ctx.getApiKey());
        }

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
            if (usageNode.has("prompt_tokens")) promptTokens = usageNode.get("prompt_tokens").asInt();
            if (usageNode.has("completion_tokens")) completionTokens = usageNode.get("completion_tokens").asInt();
        }

        String finalGeneratedText = "";
        List<ObjectNode> tcs = new ArrayList<>();

        if (responseNode.has("choices") && responseNode.get("choices").isArray() && responseNode.get("choices").size() > 0) {
            JsonNode choice = responseNode.get("choices").get(0);
            JsonNode messageNode = choice.get("message");
            
            if (messageNode != null) {
                if (messageNode.has("content") && !messageNode.get("content").isNull()) {
                    finalGeneratedText = messageNode.get("content").asText();
                }
                if (messageNode.has("tool_calls")) {
                    messageNode.get("tool_calls").forEach(tc -> tcs.add((ObjectNode) tc));
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
        if (!line.startsWith("data: ") || line.equals("data: [DONE]")) {
            return null;
        }

        JsonNode chunk = objectMapper.readTree(line.substring(6));
        if (chunk.has("choices") && chunk.get("choices").isArray() && chunk.get("choices").size() > 0) {
            JsonNode delta = chunk.get("choices").get(0).get("delta");
            if (delta != null) {
                LlmStreamChunk.LlmStreamChunkBuilder builder = LlmStreamChunk.builder();
                
                if (delta.has("content") && !delta.get("content").isNull()) {
                    builder.text(delta.get("content").asText());
                }
                
                if (delta.has("tool_calls")) {
                    List<ObjectNode> tcs = new ArrayList<>();
                    ArrayNode tcDeltaArray = (ArrayNode) delta.get("tool_calls");
                    for (JsonNode tcDelta : tcDeltaArray) {
                        tcs.add((ObjectNode) tcDelta);
                    }
                    builder.toolCalls(tcs);
                }
                return builder.build();
            }
        }
        return null;
    }
}
