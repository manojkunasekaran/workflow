package com.app.api.dto;

import com.app.persistence.entity.IntegrationScope;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateIntegrationRequest {
    @NotBlank
    private String name;
    
    @NotBlank
    private String sourceConnectorId;
    
    @NotBlank
    private String destinationConnectorId;
    
    private String description;
    private List<String> tags;
    private IntegrationScope scope;
}
