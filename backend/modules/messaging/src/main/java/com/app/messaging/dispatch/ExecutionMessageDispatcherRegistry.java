package com.app.messaging.dispatch;

import com.app.common.constant.ExecutionType;
import com.app.common.exception.ValidationException;

import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class ExecutionMessageDispatcherRegistry {

    private final Map<ExecutionType, ExecutionMessageDispatcher> dispatchers;

    public ExecutionMessageDispatcherRegistry(List<ExecutionMessageDispatcher> dispatcherList) {
        this.dispatchers = dispatcherList.stream()
                .collect(Collectors.toMap(
                        ExecutionMessageDispatcher::getType,
                        Function.identity(),
                        (left, right) -> {
                            throw new IllegalStateException(
                                    "Duplicate message dispatcher for type: " + left.getType());
                        },
                        () -> new EnumMap<>(ExecutionType.class)));
    }

    public void dispatch(ExecutionType mode, String executionId) {
        requireDispatcher(mode).dispatch(executionId);
    }

    private ExecutionMessageDispatcher requireDispatcher(ExecutionType mode) {
        ExecutionMessageDispatcher dispatcher = dispatchers.get(mode);
        if (dispatcher == null) {
            throw new ValidationException("Unsupported execution type: " + mode);
        }
        return dispatcher;
    }
}
