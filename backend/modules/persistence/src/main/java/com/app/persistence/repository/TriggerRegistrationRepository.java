package com.app.persistence.repository;

import com.app.common.constant.TriggerRegistrationStatus;
import com.app.common.entity.TriggerRegistration;
import com.app.common.model.trigger.TriggerType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TriggerRegistrationRepository extends MongoRepository<TriggerRegistration, String> {

    Optional<TriggerRegistration> findByWorkflowDefinitionId(String workflowDefinitionId);

    List<TriggerRegistration> findByTriggerTypeAndStatus(TriggerType triggerType, TriggerRegistrationStatus status);

    Optional<TriggerRegistration> findByMcpToolNameAndStatus(String mcpToolName, TriggerRegistrationStatus status);
}
