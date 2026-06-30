package com.app.persistence.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.app.common.entity.Organization;

@Repository
public interface OrganizationRepository extends MongoRepository<Organization, String> {
}
