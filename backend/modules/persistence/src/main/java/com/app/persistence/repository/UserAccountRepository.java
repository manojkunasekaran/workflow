package com.app.persistence.repository;

import com.app.common.auth.SignInMethod;
import com.app.common.entity.UserAccount;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserAccountRepository extends MongoRepository<UserAccount, ObjectId> {
    Optional<UserAccount> findBySignInMethodAndProviderUserId(SignInMethod signInMethod, String providerUserId);
}
