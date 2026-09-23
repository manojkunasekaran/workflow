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
}
