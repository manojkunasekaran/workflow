package com.app.messaging.rabbit;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class QueueConstants {

    public static final String TOPIC_WORKFLOW_EXECUTION = "workflow.execution";
    public static final String TOPIC_WORKFLOW_EXECUTION_DELAY = "workflow.execution.delay";
    public static final String CONSUMER_GROUP_CORE = "workflow-core-group";
}
