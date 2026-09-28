package com.app.api.service.poll;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * Micrometer metrics for poll trigger execution.
 */
@Component
@RequiredArgsConstructor
public class PollMetrics {

    private static final String DURATION_METRIC = "poll.duration";
    private static final String ITEMS_NEW_METRIC = "poll.items.new";
    private static final String ERRORS_METRIC = "poll.errors";

    private final MeterRegistry meterRegistry;

    private Timer durationTimer;
    private Counter errorsCounter;
    private Counter itemsNewCounter;

    @PostConstruct
    void init() {
        durationTimer = Timer.builder(DURATION_METRIC).register(meterRegistry);
        errorsCounter = Counter.builder(ERRORS_METRIC).register(meterRegistry);
        itemsNewCounter = Counter.builder(ITEMS_NEW_METRIC).register(meterRegistry);
    }

    public void recordPoll(long durationMs, int itemsNew, boolean error) {
        durationTimer.record(durationMs, TimeUnit.MILLISECONDS);

        if (error) {
            errorsCounter.increment();
        }

        if (itemsNew > 0) {
            itemsNewCounter.increment(itemsNew);
        }
    }
}
