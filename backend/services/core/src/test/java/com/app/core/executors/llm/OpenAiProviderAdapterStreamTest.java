package com.app.core.executors.llm;

import com.app.core.model.llm.LlmStreamChunk;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OpenAiProviderAdapterStreamTest {

    private final OpenAiProviderAdapter adapter = new OpenAiProviderAdapter(new ObjectMapper());

    @Test
    void parseStreamChunk_extractsUsageFromFinalChunk() throws Exception {
        String line = "data: {\"usage\":{\"prompt_tokens\":11,\"completion_tokens\":7}}";

        LlmStreamChunk chunk = adapter.parseStreamChunk(line);

        assertThat(chunk).isNotNull();
        assertThat(chunk.getPromptTokens()).isEqualTo(11);
        assertThat(chunk.getCompletionTokens()).isEqualTo(7);
    }
}
