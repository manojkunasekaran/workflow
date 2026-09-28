package com.app.common.model.trigger;

/**
 * How workflow executions are created when poll detects changes.
 */
public enum PollRunMode {
    /** One workflow execution per new/changed item. */
    PER_ITEM,
    /** Single workflow execution with all new/changed items in inputs. */
    BATCH
}
