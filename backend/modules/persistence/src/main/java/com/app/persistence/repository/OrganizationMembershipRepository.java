package com.app.persistence.repository;

import com.app.common.entity.OrganizationMembership;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrganizationMembershipRepository extends MongoRepository<OrganizationMembership, ObjectId> {

    List<OrganizationMembership> findByUserId(ObjectId userId);

    Optional<OrganizationMembership> findByUserIdAndOrganizationId(ObjectId userId, String organizationId);

    List<OrganizationMembership> findByOrganizationId(String organizationId);

    long countByOrganizationId(String organizationId);

    void deleteByOrganizationId(String organizationId);

    void deleteByUserIdAndOrganizationId(ObjectId userId, String organizationId);
}
