package com.app.persistence.repository;

import com.app.common.connector.ConnectorScope;
import com.app.persistence.entity.ConnectorManifestEntity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConnectorManifestRepository extends MongoRepository<ConnectorManifestEntity, String> {
    
    List<ConnectorManifestEntity> findByScope(ConnectorScope scope);
    
    List<ConnectorManifestEntity> findByOrganizationId(String organizationId);
    
    Optional<ConnectorManifestEntity> findByConnectorIdAndScopeAndOrganizationId(String connectorId, ConnectorScope scope, String organizationId);
}
