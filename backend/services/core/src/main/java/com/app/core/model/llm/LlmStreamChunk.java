package com.app.core.model.llm;

import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class LlmStreamChunk {
    private String text;
    private List<ObjectNode> toolCalls;
    /** Present on providers that include usage in the final SSE chunk (e.g. OpenAI with stream_options). */
    private Integer promptTokens;
    private Integer completionTokens;
}
