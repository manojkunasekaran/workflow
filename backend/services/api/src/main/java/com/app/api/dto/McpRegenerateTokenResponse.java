package com.app.api.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class McpRegenerateTokenResponse {
    private String token;
}
