package com.app.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PollReprocessResult {

    private boolean success;
    private int itemsMatched;
    private int itemsTriggered;
    private List<Map<String, Object>> matchedItems;
    private List<String> unmatchedKeys;
    private String error;

    @Builder.Default
    private List<String> triggeredKeys = new ArrayList<>();
}
