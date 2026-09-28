package com.app.api.service.poll;

import com.app.common.entity.TriggerPollState;
import com.app.common.model.trigger.ChangeDetectionConfig;
import com.app.common.model.trigger.PollConfig;
import com.app.common.model.trigger.PollEventSemantics;

import java.util.List;
import java.util.Map;

/**
 * Strategy for detecting changes in polled data.
 */
public interface ChangeDetectionStrategy {

    PollEventSemantics semantics();

    ChangeDetectionResult detect(
            PollConfig pollConfig,
            ChangeDetectionConfig detection,
            TriggerPollState state,
            List<Map<String, Object>> items,
            String rawResponseBody,
            Object parsedBody,
            PollResponseParser parser,
            int maxTrackedKeys);
}
