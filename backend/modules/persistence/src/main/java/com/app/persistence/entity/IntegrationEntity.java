package com.app.persistence.entity;

import com.app.common.model.base.BaseModel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "integrations")
@CompoundIndexes({
    @CompoundIndex(def = "{'organizationId': 1, 'status': 1}"),
    @CompoundIndex(def = "{'sourceConnectorId': 1, 'destinationConnectorId': 1}")
})
public class IntegrationEntity extends BaseModel {
    private String name;
    private String description;
    private String sourceConnectorId;
    private String destinationConnectorId;
    private IntegrationScope scope;
    private IntegrationStatus status;
    private String organizationId;
    private String ownerId;
    private List<String> tags;
}
