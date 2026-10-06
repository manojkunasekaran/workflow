package com.app.persistence.repository;

import com.app.persistence.entity.IntegrationEntity;
import com.app.persistence.entity.IntegrationScope;
import com.app.persistence.entity.IntegrationStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IntegrationRepository extends MongoRepository<IntegrationEntity, String> {
    List<IntegrationEntity> findByOrganizationIdAndStatus(String organizationId, IntegrationStatus status);
    List<IntegrationEntity> findByScope(IntegrationScope scope);
    List<IntegrationEntity> findByScopeAndStatus(IntegrationScope scope, IntegrationStatus status);
    Optional<IntegrationEntity> findByIdAndOrganizationId(String id, String organizationId);
    List<IntegrationEntity> findBySourceConnectorIdAndDestinationConnectorId(String sourceConnectorId, String destinationConnectorId);
}
