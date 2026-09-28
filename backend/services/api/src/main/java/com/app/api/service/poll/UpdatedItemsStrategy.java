package com.app.api.service.poll;

import com.app.common.entity.TriggerPollState;
import com.app.common.model.trigger.ChangeDetectionConfig;
import com.app.common.model.trigger.PollConfig;
import com.app.common.model.trigger.PollEpoch;
import com.app.common.model.trigger.PollEventSemantics;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class UpdatedItemsStrategy implements ChangeDetectionStrategy {

    @Override
    public PollEventSemantics semantics() {
        return PollEventSemantics.UPDATED;
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
        Map<String, String> lastUpdateByKey = buildUpdateIndex(state);

        List<Map<String, Object>> triggerItems = new ArrayList<>();
        List<Map<String, Object>> skippedItems = new ArrayList<>();
        int itemsUpdated = 0;
        int itemsSkipped = 0;

        boolean establishingBaseline = !state.isBaselineEstablished()
                && (pollConfig.getEpoch() == PollEpoch.NOW || pollConfig.getEpoch() == PollEpoch.ALL);

        for (Map<String, Object> item : items) {
            String key = parser.extractItemKey(item, detection);
            if (key == null) {
                itemsSkipped++;
                skippedItems.add(item);
                continue;
            }

            String updateKey = parser.extractUpdateKey(item, detection);

            if (PollEpochHelper.isBeforeEpoch(item, pollConfig, detection, parser)) {
                NewItemsStrategy.recordSeenKey(state, key, maxTrackedKeys);
                storeUpdateKey(state, key, updateKey);
                itemsSkipped++;
                skippedItems.add(item);
                continue;
            }

            if (establishingBaseline) {
                NewItemsStrategy.recordSeenKey(state, key, maxTrackedKeys);
                storeUpdateKey(state, key, updateKey);
                itemsSkipped++;
                skippedItems.add(item);
                continue;
            }

            String previousUpdate = lastUpdateByKey.get(key);
            if (previousUpdate == null) {
                NewItemsStrategy.recordSeenKey(state, key, maxTrackedKeys);
                storeUpdateKey(state, key, updateKey);
                itemsSkipped++;
                skippedItems.add(item);
                continue;
            }

            if (updateKey != null && !updateKey.equals(previousUpdate)) {
                itemsUpdated++;
                triggerItems.add(item);
                storeUpdateKey(state, key, updateKey);
            } else {
                itemsSkipped++;
                skippedItems.add(item);
            }
        }

        if (establishingBaseline) {
            state.setBaselineEstablished(true);
        }

        return ChangeDetectionResult.builder()
                .triggerItems(triggerItems)
                .skippedItems(skippedItems)
                .itemsUpdated(itemsUpdated)
                .itemsSkipped(itemsSkipped)
                .build();
    }

    private Map<String, String> buildUpdateIndex(TriggerPollState state) {
        Map<String, String> index = new HashMap<>();
        for (TriggerPollState.SeenKey seenKey : state.getSeenKeys()) {
            if (seenKey.getKey() != null && seenKey.getKey().contains("::")) {
                String[] parts = seenKey.getKey().split("::", 2);
                index.put(parts[0], parts[1]);
            }
        }
        return index;
    }

    private void storeUpdateKey(TriggerPollState state, String itemKey, String updateKey) {
        String composite = itemKey + "::" + (updateKey != null ? updateKey : "");
        boolean exists = state.getSeenKeys().stream().anyMatch(sk -> sk.getKey().startsWith(itemKey + "::"));
        if (!exists) {
            state.getSeenKeys().add(TriggerPollState.SeenKey.builder()
                    .key(composite)
                    .firstSeenAt(Instant.now())
                    .build());
        } else {
            state.getSeenKeys().removeIf(sk -> sk.getKey().startsWith(itemKey + "::"));
            state.getSeenKeys().add(TriggerPollState.SeenKey.builder()
                    .key(composite)
                    .firstSeenAt(Instant.now())
                    .build());
        }
    }
}
