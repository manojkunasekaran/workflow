package com.app.core.model.llm;

import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class LlmRequestContext {
    private String baseUrl;
    private String model;
    private List<ObjectNode> messages;
    private List<ObjectNode> tools;
    private Double temperature;
    private Integer maxTokens;
    private boolean stream;
    private String apiKey;
    private Map<String, String> extraHeaders;
}
