package com.app.core.model.llm;

import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class LlmResponse {
    private String generatedText;
    private List<ObjectNode> toolCalls;
    private Integer promptTokens;
    private Integer completionTokens;
    private Map<String, Object> rawResponseBody;
}
