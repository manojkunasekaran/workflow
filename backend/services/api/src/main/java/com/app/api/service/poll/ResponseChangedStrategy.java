package com.app.api.service.poll;

import com.app.common.entity.TriggerPollState;
import com.app.common.model.trigger.ChangeDetectionConfig;
import com.app.common.model.trigger.PollConfig;
import com.app.common.model.trigger.PollEpoch;
import com.app.common.model.trigger.PollEventSemantics;
import com.app.common.util.DataTransformUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class ResponseChangedStrategy implements ChangeDetectionStrategy {

    private final ObjectMapper objectMapper;

    @Override
    public PollEventSemantics semantics() {
        return PollEventSemantics.RESPONSE_CHANGED;
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
        String hash = hashResponse(detection, rawResponseBody, parsedBody);
        String previousHash = state.getLastResponseHash();
        boolean establishingBaseline = !state.isBaselineEstablished()
                && (pollConfig.getEpoch() == PollEpoch.NOW || pollConfig.getEpoch() == PollEpoch.ALL);

        boolean changed = previousHash != null && !previousHash.equals(hash);
        state.setLastResponseHash(hash);

        if (establishingBaseline) {
            state.setBaselineEstablished(true);
            return ChangeDetectionResult.builder()
                    .triggerItems(Collections.emptyList())
                    .skippedItems(items)
                    .itemsSkipped(items.size())
                    .responseHash(hash)
                    .responseChanged(false)
                    .build();
        }

        if (changed) {
            return ChangeDetectionResult.builder()
                    .triggerItems(items)
                    .itemsNew(items.size())
                    .responseHash(hash)
                    .responseChanged(true)
                    .build();
        }

        return ChangeDetectionResult.builder()
                .triggerItems(Collections.emptyList())
                .skippedItems(items)
                .itemsSkipped(items.size())
                .responseHash(hash)
                .responseChanged(false)
                .build();
    }

    private String hashResponse(ChangeDetectionConfig detection, String rawResponseBody, Object parsedBody) {
        Object body = parsedBody;
        if (body == null && rawResponseBody != null && !rawResponseBody.isBlank()) {
            body = DataTransformUtils.parseJsonString(rawResponseBody, objectMapper);
        }

        if (detection != null && detection.getHashIgnorePaths() != null && !detection.getHashIgnorePaths().isEmpty()) {
            body = DataTransformUtils.stripJsonPaths(body, detection.getHashIgnorePaths());
        }

        String canonical = DataTransformUtils.canonicalJson(body, objectMapper);
        return DataTransformUtils.sha256Hex(canonical);
    }
}
