package com.app.messaging.dispatch;

import com.app.common.constant.ExecutionType;

/**
 * Hands off a QUEUED execution to core for the given execution mode.
 */
public interface ExecutionMessageDispatcher {

    ExecutionType getType();

    void dispatch(String executionId);
}
