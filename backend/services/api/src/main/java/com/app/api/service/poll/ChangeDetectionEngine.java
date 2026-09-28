package com.app.api.service.poll;

import com.app.common.entity.TriggerPollState;
import com.app.common.model.trigger.ChangeDetectionConfig;
import com.app.common.model.trigger.PollConfig;
import com.app.common.model.trigger.PollEventSemantics;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Dispatches change detection to the appropriate strategy based on poll semantics.
 */
@Component
public class ChangeDetectionEngine {

    private final Map<PollEventSemantics, ChangeDetectionStrategy> strategies;
    private final PollResponseParser responseParser;

    public ChangeDetectionEngine(
            NewItemsStrategy newItemsStrategy,
            UpdatedItemsStrategy updatedItemsStrategy,
            NewOrUpdatedStrategy newOrUpdatedStrategy,
            ResponseChangedStrategy responseChangedStrategy,
            PollResponseParser responseParser) {
        this.responseParser = responseParser;
        strategies = new EnumMap<>(PollEventSemantics.class);
        strategies.put(PollEventSemantics.NEW_ITEMS, newItemsStrategy);
        strategies.put(PollEventSemantics.UPDATED, updatedItemsStrategy);
        strategies.put(PollEventSemantics.NEW_OR_UPDATED, newOrUpdatedStrategy);
        strategies.put(PollEventSemantics.RESPONSE_CHANGED, responseChangedStrategy);
    }

    public ChangeDetectionResult detect(
            PollConfig pollConfig,
            TriggerPollState state,
            List<Map<String, Object>> items,
            String rawResponseBody,
            Object parsedBody,
            int maxTrackedKeys) {
        PollEventSemantics semantics = pollConfig.getSemantics();
        ChangeDetectionStrategy strategy = strategies.get(semantics);
        if (strategy == null) {
            throw new IllegalArgumentException("Unsupported poll semantics: " + semantics);
        }

        ChangeDetectionConfig detection = pollConfig.getDetection();
        state.setSemantics(semantics);

        return strategy.detect(
                pollConfig,
                detection,
                state,
                items,
                rawResponseBody,
                parsedBody,
                responseParser,
                maxTrackedKeys);
    }
}
