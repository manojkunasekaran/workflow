package com.app.api.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Preview result from a test poll — no workflow execution is triggered.
 */
@Data
@Builder
public class PollTestResult {
    private boolean success;
    private long durationMs;
    private int itemsFetched;
    private int itemsNew;
    private int itemsUpdated;
    private int itemsSkipped;
    private List<Map<String, Object>> newItems;
    private List<Map<String, Object>> skippedItems;
    private String error;
    private String warning;
}
