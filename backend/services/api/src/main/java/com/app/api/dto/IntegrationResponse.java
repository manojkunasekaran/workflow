package com.app.api.dto;

import com.app.persistence.entity.IntegrationScope;
import com.app.persistence.entity.IntegrationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IntegrationResponse {
    private String id;
    private Instant createdAt;
    private Instant updatedAt;
    private String createdBy;
    private String lastModifiedBy;
    
    private String name;
    private String description;
    private String sourceConnectorId;
    private String destinationConnectorId;
    private IntegrationScope scope;
    private IntegrationStatus status;
    private String organizationId;
    private String ownerId;
    private List<String> tags;
    
    private String sourceConnectorName;
    private String sourceConnectorIcon;
    private String destinationConnectorName;
    private String destinationConnectorIcon;
    private int useCaseCount;
}
