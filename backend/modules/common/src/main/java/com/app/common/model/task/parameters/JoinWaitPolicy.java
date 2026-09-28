package com.app.common.model.task.parameters;

/**
 * Controls how many inbound tasks a JOIN must wait for before continuing.
 */
public enum JoinWaitPolicy {
    ALL,
    ANY,
    QUORUM
}
