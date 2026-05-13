package com.app.common.constant;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Technology-agnostic constants for message queue topics/queues.
 * Mapped to concrete queue infrastructure in the configuration layer.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class QueueConstants {

    /** Queue/topic for new workflow execution requests. */
    public static final String TOPIC_WORKFLOW_TRIGGER = "workflow.trigger";

    /** Queue/topic for workflow resume signals (e.g., human task responses). */
    public static final String TOPIC_WORKFLOW_RESUME = "workflow.resume";

    /** Consumer group ID for the core workflow engine. */
    public static final String CONSUMER_GROUP_CORE = "workflow-core-group";
}
