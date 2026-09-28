package com.app.persistence.repository;

import com.app.common.entity.TriggerWebhookEventDedupe;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface TriggerWebhookEventDedupeRepository extends MongoRepository<TriggerWebhookEventDedupe, String> {

    Optional<TriggerWebhookEventDedupe> findByRegistrationIdAndEventId(String registrationId, String eventId);

    void deleteByRegistrationIdAndSeenAtBefore(String registrationId, Instant seenAt);
}
