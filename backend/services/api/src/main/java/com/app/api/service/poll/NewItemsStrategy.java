package com.app.api.service.poll;

import com.app.common.entity.TriggerPollState;
import com.app.common.model.trigger.ChangeDetectionConfig;
import com.app.common.model.trigger.PollConfig;
import com.app.common.model.trigger.PollEpoch;
import com.app.common.model.trigger.PollEventSemantics;
import com.app.common.model.trigger.UniqueKeyMode;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class NewItemsStrategy implements ChangeDetectionStrategy {

    @Override
    public PollEventSemantics semantics() {
        return PollEventSemantics.NEW_ITEMS;
    }

    @Override
    public ChangeDetectionResult detect(
            PollConfig pollConfig,
            ChangeDetectionConfig detection,
            TriggerPollState state,
            List<Map<String, Object>> items,
            String rawResponseBody,
            Object parsedBody,
            PollResponseParser parser,
            int maxTrackedKeys) {
        Set<String> seen = new HashSet<>();
        for (TriggerPollState.SeenKey seenKey : state.getSeenKeys()) {
            seen.add(seenKey.getKey());
        }

        List<Map<String, Object>> triggerItems = new ArrayList<>();
        List<Map<String, Object>> skippedItems = new ArrayList<>();
        String warning = null;
        int itemsNew = 0;
        int itemsSkipped = 0;

        boolean seedingBaseline = !state.isBaselineEstablished()
                && pollConfig.getEpoch() != PollEpoch.FROM_DATE;

        for (Map<String, Object> item : items) {
            String key = parser.extractItemKey(item, detection);
            if (key == null) {
                itemsSkipped++;
                skippedItems.add(item);
                continue;
            }

            if (PollEpochHelper.isBeforeEpoch(item, pollConfig, detection, parser)) {
                recordSeenKey(state, key, maxTrackedKeys);
                itemsSkipped++;
                skippedItems.add(item);
                continue;
            }

            if (seedingBaseline) {
                recordSeenKey(state, key, maxTrackedKeys);
                itemsSkipped++;
                skippedItems.add(item);
                continue;
            }

            if (seen.contains(key)) {
                itemsSkipped++;
                skippedItems.add(item);
            } else {
                itemsNew++;
                triggerItems.add(item);
                recordSeenKey(state, key, maxTrackedKeys);
            }
        }

        if (seedingBaseline) {
            state.setBaselineEstablished(true);
        }

        if (items.stream().anyMatch(i -> parser.extractItemKey(i, detection) == null)
                && (detection == null
                || (detection.getUniqueKeyMode() != UniqueKeyMode.CONTENT_HASH
                && (detection.getKeyPaths() == null || detection.getKeyPaths().isEmpty())))) {
            warning = "Some items lack an 'id' field; configure keyPaths for reliable deduplication.";
        }

        return ChangeDetectionResult.builder()
                .triggerItems(triggerItems)
                .skippedItems(skippedItems)
                .itemsNew(itemsNew)
                .itemsSkipped(itemsSkipped)
                .warning(warning)
                .build();
    }

    static void recordSeenKey(TriggerPollState state, String key, int maxTrackedKeys) {
        boolean exists = state.getSeenKeys().stream().anyMatch(sk -> sk.getKey().equals(key));
        if (!exists) {
            state.getSeenKeys().add(TriggerPollState.SeenKey.builder()
                    .key(key)
                    .firstSeenAt(Instant.now())
                    .build());
            evictIfNeeded(state, maxTrackedKeys);
        }
    }

    static void evictIfNeeded(TriggerPollState state, int maxTrackedKeys) {
        while (state.getSeenKeys().size() > maxTrackedKeys) {
            state.getSeenKeys().remove(0);
        }
    }
}
