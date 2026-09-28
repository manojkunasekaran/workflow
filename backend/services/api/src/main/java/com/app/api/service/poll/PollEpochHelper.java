package com.app.api.service.poll;

import com.app.common.model.trigger.ChangeDetectionConfig;
import com.app.common.model.trigger.PollConfig;
import com.app.common.model.trigger.PollEpoch;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Map;

/**
 * Shared FROM_DATE epoch filtering for poll change-detection strategies.
 */
final class PollEpochHelper {

    private PollEpochHelper() {
    }

    static boolean isBeforeEpoch(
            Map<String, Object> item,
            PollConfig pollConfig,
            ChangeDetectionConfig detection,
            PollResponseParser parser) {
        if (pollConfig.getEpoch() != PollEpoch.FROM_DATE || pollConfig.getEpochDate() == null) {
            return false;
        }
        Instant epochInstant = parseEpochDate(pollConfig.getEpochDate());
        if (epochInstant == null) {
            return false;
        }
        Instant itemTimestamp = parser.extractItemTimestamp(item, detection);
        return itemTimestamp != null && itemTimestamp.isBefore(epochInstant);
    }

    private static Instant parseEpochDate(String epochDate) {
        try {
            return Instant.parse(epochDate);
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
