package com.app.persistence.repository;

import com.app.common.entity.OAuthState;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OAuthStateRepository extends MongoRepository<OAuthState, String> {
    // Lookup by both id and connectorId prevents state-hijacking across connectors
    java.util.Optional<OAuthState> findByIdAndConnectorId(String id, String connectorId);
}
