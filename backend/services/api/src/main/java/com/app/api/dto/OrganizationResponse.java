package com.app.api.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class OrganizationResponse {
    String id;
    String name;
}
