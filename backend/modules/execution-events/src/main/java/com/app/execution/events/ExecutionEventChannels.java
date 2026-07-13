package com.app.execution.events;

public final class ExecutionEventChannels {

    public static final String PATTERN = "execution:*";

    private ExecutionEventChannels() {
    }

    public static String forExecution(String executionId) {
        return "execution:" + executionId;
    }
}
