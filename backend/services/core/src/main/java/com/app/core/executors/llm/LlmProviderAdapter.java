package com.app.core.executors.llm;

import com.app.common.entity.LlmProviderType;
import com.app.core.model.llm.LlmRequestContext;
import com.app.core.model.llm.LlmResponse;
import com.app.core.model.llm.LlmStreamChunk;

import java.net.http.HttpRequest;

public interface LlmProviderAdapter {

    boolean supports(LlmProviderType type);

    HttpRequest buildRequest(LlmRequestContext ctx) throws Exception;

    LlmResponse parseResponse(String body) throws Exception;

    LlmStreamChunk parseStreamChunk(String line) throws Exception;
}
