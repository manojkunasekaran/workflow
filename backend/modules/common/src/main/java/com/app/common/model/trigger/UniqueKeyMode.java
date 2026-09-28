package com.app.common.model.trigger;

/**
 * How poll items are identified for deduplication and change detection.
 */
public enum UniqueKeyMode {
    /** Derive key from configured JsonPath field(s). */
    FIELD,
    /** Derive key from a canonical fingerprint of item content. */
    CONTENT_HASH
}
