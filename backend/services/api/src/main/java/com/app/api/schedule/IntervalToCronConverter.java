package com.app.api.schedule;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.util.Optional;

/**
 * Converts fixed poll intervals to 6-field Spring cron expressions when possible.
 * Returns empty for sub-minute or non-aligned intervals that require fixed-rate scheduling.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class IntervalToCronConverter {

    /**
     * Attempt to convert {@code intervalSeconds} to a 6-field Spring cron expression.
     *
     * @return cron expression, or empty when fixed-rate scheduling is required
     */
    public static Optional<String> toCron(long intervalSeconds) {
        if (intervalSeconds < 60) {
            return Optional.empty();
        }

        if (intervalSeconds % 60 == 0) {
            long minutes = intervalSeconds / 60;
            if (minutes < 60) {
                if (minutes == 1) {
                    return Optional.of("0 * * * * *");
                }
                if (60 % minutes == 0) {
                    return Optional.of("0 */" + minutes + " * * * *");
                }
                return Optional.empty();
            }
        }

        if (intervalSeconds % 3600 == 0) {
            long hours = intervalSeconds / 3600;
            if (hours < 24) {
                if (hours == 1) {
                    return Optional.of("0 0 * * * *");
                }
                if (24 % hours == 0) {
                    return Optional.of("0 0 */" + hours + " * * *");
                }
                return Optional.empty();
            }
        }

        if (intervalSeconds % 86400 == 0) {
            long days = intervalSeconds / 86400;
            if (days == 1) {
                return Optional.of("0 0 0 * * *");
            }
            if (days <= 31) {
                return Optional.of("0 0 0 */" + days + " * *");
            }
        }

        return Optional.empty();
    }
}
