package com.app.api.service.poll;

import lombok.Builder;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Outcome of change detection for a single poll cycle.
 */
@Data
@Builder
public class ChangeDetectionResult {
    @Builder.Default
    private List<Map<String, Object>> triggerItems = new ArrayList<>();

    @Builder.Default
    private List<Map<String, Object>> skippedItems = new ArrayList<>();

    private int itemsNew;
    private int itemsUpdated;
    private int itemsSkipped;
    private String responseHash;
    private boolean responseChanged;
    private String warning;
}
