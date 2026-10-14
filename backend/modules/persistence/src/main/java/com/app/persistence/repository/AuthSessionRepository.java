package com.app.persistence.repository;

import com.app.common.entity.AuthSession;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuthSessionRepository extends MongoRepository<AuthSession, ObjectId> {
}
