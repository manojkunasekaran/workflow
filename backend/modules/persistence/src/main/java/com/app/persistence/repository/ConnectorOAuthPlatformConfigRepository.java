package com.app.persistence.repository;

import com.app.persistence.entity.ConnectorOAuthPlatformConfigEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface ConnectorOAuthPlatformConfigRepository
        extends MongoRepository<ConnectorOAuthPlatformConfigEntity, String> {

    Optional<ConnectorOAuthPlatformConfigEntity> findByConnectorId(String connectorId);
}
