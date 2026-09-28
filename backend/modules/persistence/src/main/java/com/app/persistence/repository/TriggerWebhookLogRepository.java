package com.app.persistence.repository;

import com.app.common.constant.TriggerWebhookEventType;
import com.app.common.entity.TriggerWebhookLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TriggerWebhookLogRepository extends MongoRepository<TriggerWebhookLog, String> {

    Page<TriggerWebhookLog> findByRegistrationIdOrderByTimestampDesc(String registrationId, Pageable pageable);

    Page<TriggerWebhookLog> findByWorkflowDefinitionIdOrderByTimestampDesc(String workflowDefinitionId, Pageable pageable);

    Page<TriggerWebhookLog> findByWorkflowDefinitionIdAndEventTypeOrderByTimestampDesc(
            String workflowDefinitionId, TriggerWebhookEventType eventType, Pageable pageable);
}
