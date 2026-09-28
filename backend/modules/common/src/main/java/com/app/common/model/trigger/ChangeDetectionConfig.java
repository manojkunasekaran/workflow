package com.app.common.model.trigger;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Advanced change-detection settings for poll triggers.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChangeDetectionConfig {

    /** JsonPath to the array of items in the HTTP response body. */
    private String itemsPath;

    /** JsonPath(s) used to derive a stable unique key per item. */
    @Builder.Default
    private List<String> keyPaths = new ArrayList<>();

    /** JsonPath to a field indicating item update time or version. */
    private String updateKeyPath;

    /** JsonPath fields excluded when hashing the response for RESPONSE_CHANGED. */
    @Builder.Default
    private List<String> hashIgnorePaths = new ArrayList<>();

    /** How to derive a stable unique key per item. */
    @Builder.Default
    private UniqueKeyMode uniqueKeyMode = UniqueKeyMode.FIELD;

    /**
     * JsonPath fields included in the content fingerprint when uniqueKeyMode = CONTENT_HASH.
     * Empty means the entire item is fingerprinted.
     */
    @Builder.Default
    private List<String> contentHashPaths = new ArrayList<>();

    /**
     * JsonPath to an item timestamp used with FROM_DATE epoch filtering.
     */
    private String timestampPath;

    @Builder.Default
    private Integer maxItemsPerPoll = 1000;
}
