package com.app.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignUseCaseRequest {
    @NotBlank
    private String workflowId;
    
    @NotBlank
    private String useCaseTitle;
    
    private String useCaseDescription;
}
