package com.app.persistence.repository;

import com.app.common.entity.TriggerPollState;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TriggerPollStateRepository extends MongoRepository<TriggerPollState, String> {

    Optional<TriggerPollState> findByRegistrationId(String registrationId);
}
