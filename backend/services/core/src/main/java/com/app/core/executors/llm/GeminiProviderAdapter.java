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
public class GeminiProviderAdapter implements LlmProviderAdapter {

    private final ObjectMapper objectMapper;

    @Override
    public boolean supports(LlmProviderType type) {
        return type == LlmProviderType.GEMINI;
    }

    @Override
    public HttpRequest buildRequest(LlmRequestContext ctx) throws Exception {
        ObjectNode requestBody = objectMapper.createObjectNode();
        
        ArrayNode contentsArray = requestBody.putArray("contents");
        
        if (ctx.getMessages() != null) {
            for (ObjectNode msg : ctx.getMessages()) {
                String role = msg.has("role") ? msg.get("role").asText() : "";
                if ("system".equals(role)) {
                    ObjectNode systemInstruction = objectMapper.createObjectNode();
                    ObjectNode part = systemInstruction.putArray("parts").addObject();
                    part.put("text", msg.get("content").asText());
                    requestBody.set("systemInstruction", systemInstruction);
                } else if ("user".equals(role) || "assistant".equals(role)) {
                    ObjectNode content = contentsArray.addObject();
                    content.put("role", "assistant".equals(role) ? "model" : "user");
                    ObjectNode part = content.putArray("parts").addObject();
                    part.put("text", msg.has("content") ? msg.get("content").asText() : "");
                    
                    if (msg.has("tool_calls")) {
                        // We map assistant tool calls back into model parts
                        for (JsonNode tc : msg.get("tool_calls")) {
                            ObjectNode callPart = content.withArray("parts").addObject();
                            ObjectNode functionCall = callPart.putObject("functionCall");
                            JsonNode func = tc.get("function");
                            if (func != null) {
                                functionCall.put("name", func.get("name").asText());
                                functionCall.set("args", objectMapper.readTree(func.get("arguments").asText()));
                            }
                        }
                    }
                } else if ("tool".equals(role)) {
                    ObjectNode content = contentsArray.addObject();
                    content.put("role", "user"); // tool responses are sent as user
                    ObjectNode part = content.putArray("parts").addObject();
                    ObjectNode functionResponse = part.putObject("functionResponse");
                    functionResponse.put("name", msg.get("tool_call_id").asText());
                    ObjectNode responseWrapper = functionResponse.putObject("response");
                    try {
                        responseWrapper.set("result", objectMapper.readTree(msg.get("content").asText()));
                    } catch (Exception e) {
                        responseWrapper.put("result", msg.get("content").asText());
                    }
                }
            }
        }
        
        if (ctx.getTools() != null && !ctx.getTools().isEmpty()) {
            ArrayNode toolsArray = requestBody.putArray("tools");
            ObjectNode toolObj = toolsArray.addObject();
            ArrayNode functionDeclarations = toolObj.putArray("functionDeclarations");
            for (ObjectNode oaiTool : ctx.getTools()) {
                if (oaiTool.has("function")) {
                    JsonNode func = oaiTool.get("function");
                    ObjectNode geminiTool = functionDeclarations.addObject();
                    if (func.has("name")) geminiTool.put("name", func.get("name").asText());
                    if (func.has("description")) geminiTool.put("description", func.get("description").asText());
                    if (func.has("parameters")) geminiTool.set("parameters", func.get("parameters"));
                }
            }
        }

        ObjectNode generationConfig = requestBody.putObject("generationConfig");
        if (ctx.getTemperature() != null) generationConfig.put("temperature", ctx.getTemperature());
        if (ctx.getMaxTokens() != null) generationConfig.put("maxOutputTokens", ctx.getMaxTokens());

        String model = ctx.getModel() != null && !ctx.getModel().isEmpty() ? ctx.getModel() : "gemini-1.5-flash";
        String url = ctx.getBaseUrl();
        if (url == null || url.isEmpty()) {
            url = "https://generativelanguage.googleapis.com/v1beta/models/" + model;
            url += ctx.isStream() ? ":streamGenerateContent" : ":generateContent";
        }
        
        if (ctx.getApiKey() != null && !ctx.getApiKey().isEmpty()) {
            url += (url.contains("?") ? "&" : "?") + "key=" + ctx.getApiKey();
        }

        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
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
        if (responseNode.has("usageMetadata")) {
            JsonNode usageNode = responseNode.get("usageMetadata");
            if (usageNode.has("promptTokenCount")) promptTokens = usageNode.get("promptTokenCount").asInt();
            if (usageNode.has("candidatesTokenCount")) completionTokens = usageNode.get("candidatesTokenCount").asInt();
        }

        String finalGeneratedText = "";
        List<ObjectNode> tcs = new ArrayList<>();

        if (responseNode.has("candidates") && responseNode.get("candidates").isArray() && responseNode.get("candidates").size() > 0) {
            JsonNode candidate = responseNode.get("candidates").get(0);
            if (candidate.has("content") && candidate.get("content").has("parts")) {
                for (JsonNode part : candidate.get("content").get("parts")) {
                    if (part.has("text")) {
                        finalGeneratedText += part.get("text").asText();
                    } else if (part.has("functionCall")) {
                        JsonNode call = part.get("functionCall");
                        ObjectNode tc = objectMapper.createObjectNode();
                        String name = call.get("name").asText();
                        tc.put("id", name); // Gemini doesn't have call IDs, use name
                        tc.put("type", "function");
                        ObjectNode func = tc.putObject("function");
                        func.put("name", name);
                        func.put("arguments", call.has("args") ? objectMapper.writeValueAsString(call.get("args")) : "{}");
                        tcs.add(tc);
                    }
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
        if (data.equals("[DONE]") || data.isEmpty()) return null;

        JsonNode responseNode = objectMapper.readTree(data);
        if (responseNode.has("candidates") && responseNode.get("candidates").isArray() && responseNode.get("candidates").size() > 0) {
            JsonNode candidate = responseNode.get("candidates").get(0);
            if (candidate.has("content") && candidate.get("content").has("parts")) {
                String text = "";
                List<ObjectNode> tcs = new ArrayList<>();
                for (JsonNode part : candidate.get("content").get("parts")) {
                    if (part.has("text")) {
                        text += part.get("text").asText();
                    } else if (part.has("functionCall")) {
                        JsonNode call = part.get("functionCall");
                        ObjectNode tc = objectMapper.createObjectNode();
                        tc.put("index", 0);
                        String name = call.get("name").asText();
                        tc.put("id", name);
                        tc.put("type", "function");
                        ObjectNode func = tc.putObject("function");
                        func.put("name", name);
                        func.put("arguments", call.has("args") ? objectMapper.writeValueAsString(call.get("args")) : "{}");
                        tcs.add(tc);
                    }
                }
                return LlmStreamChunk.builder()
                        .text(text.isEmpty() ? null : text)
                        .toolCalls(tcs.isEmpty() ? null : tcs)
                        .build();
            }
        }
        return null;
    }
}
