package com.app.api.dto;

import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.Map;

@Value
@Builder
public class OrganizationResponse {
    String id;
    String name;
    Map<String, Object> settings;
    Long memberCount;
    Long workflowCount;
    Instant createdAt;
}
