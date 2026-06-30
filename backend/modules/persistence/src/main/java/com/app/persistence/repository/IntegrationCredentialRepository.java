package com.app.persistence.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.app.common.entity.IntegrationCredential;

import java.util.Optional;

@Repository
public interface IntegrationCredentialRepository extends MongoRepository<IntegrationCredential, String> {
    Optional<IntegrationCredential> findByIdAndOrganizationId(String id, String organizationId);
}
