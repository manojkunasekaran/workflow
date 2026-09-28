package com.app.persistence.repository;

import com.app.common.entity.TriggerPollLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TriggerPollLogRepository extends MongoRepository<TriggerPollLog, String> {

    Page<TriggerPollLog> findByRegistrationIdOrderByPolledAtDesc(String registrationId, Pageable pageable);

    Page<TriggerPollLog> findByWorkflowDefinitionIdOrderByPolledAtDesc(String workflowDefinitionId, Pageable pageable);
}
