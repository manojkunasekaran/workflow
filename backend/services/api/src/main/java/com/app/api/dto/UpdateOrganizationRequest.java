package com.app.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Map;

/**
 * Request payload for updating an organization's details and settings.
 */
@Data
public class UpdateOrganizationRequest {
    @NotBlank
    private String name;
    private Map<String, Object> settings;
}
