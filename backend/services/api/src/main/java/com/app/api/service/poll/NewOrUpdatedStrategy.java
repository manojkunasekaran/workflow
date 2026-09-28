package com.app.api.service.poll;

import com.app.common.entity.TriggerPollState;
import com.app.common.model.trigger.ChangeDetectionConfig;
import com.app.common.model.trigger.PollConfig;
import com.app.common.model.trigger.PollEpoch;
import com.app.common.model.trigger.PollEventSemantics;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class NewOrUpdatedStrategy implements ChangeDetectionStrategy {

    @Override
    public PollEventSemantics semantics() {
        return PollEventSemantics.NEW_OR_UPDATED;
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
        Set<String> seenItemKeys = new HashSet<>();
        Map<String, String> lastUpdateByKey = new HashMap<>();
        for (TriggerPollState.SeenKey seenKey : state.getSeenKeys()) {
            if (seenKey.getKey().contains("::")) {
                String[] parts = seenKey.getKey().split("::", 2);
                seenItemKeys.add(parts[0]);
                lastUpdateByKey.put(parts[0], parts[1]);
            } else {
                seenItemKeys.add(seenKey.getKey());
            }
        }

        List<Map<String, Object>> triggerItems = new ArrayList<>();
        List<Map<String, Object>> skippedItems = new ArrayList<>();
        int itemsNew = 0;
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
                recordKey(state, key, updateKey, maxTrackedKeys);
                itemsSkipped++;
                skippedItems.add(item);
                continue;
            }

            if (establishingBaseline) {
                recordKey(state, key, updateKey, maxTrackedKeys);
                itemsSkipped++;
                skippedItems.add(item);
                continue;
            }

            if (!seenItemKeys.contains(key)) {
                itemsNew++;
                triggerItems.add(item);
                recordKey(state, key, updateKey, maxTrackedKeys);
            } else {
                String previousUpdate = lastUpdateByKey.get(key);
                if (updateKey != null && !updateKey.equals(previousUpdate)) {
                    itemsUpdated++;
                    triggerItems.add(item);
                    recordKey(state, key, updateKey, maxTrackedKeys);
                } else {
                    itemsSkipped++;
                    skippedItems.add(item);
                }
            }
        }

        if (establishingBaseline) {
            state.setBaselineEstablished(true);
        }

        return ChangeDetectionResult.builder()
                .triggerItems(triggerItems)
                .skippedItems(skippedItems)
                .itemsNew(itemsNew)
                .itemsUpdated(itemsUpdated)
                .itemsSkipped(itemsSkipped)
                .build();
    }

    private void recordKey(TriggerPollState state, String itemKey, String updateKey, int maxTrackedKeys) {
        String composite = updateKey != null ? itemKey + "::" + updateKey : itemKey;
        state.getSeenKeys().removeIf(sk ->
                sk.getKey().equals(itemKey) || sk.getKey().startsWith(itemKey + "::"));
        NewItemsStrategy.recordSeenKey(state, composite, maxTrackedKeys);
    }
}
