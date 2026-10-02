package com.app.persistence.repository;

import com.app.common.entity.TriggerMcpLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TriggerMcpLogRepository extends MongoRepository<TriggerMcpLog, String> {

    Page<TriggerMcpLog> findAllByOrderByTimestampDesc(Pageable pageable);
}
