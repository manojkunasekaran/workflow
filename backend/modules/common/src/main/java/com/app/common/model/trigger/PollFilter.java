package com.app.common.model.trigger;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Item-level filter applied after parsing poll response items.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PollFilter {

    /** JsonPath or field name on the item object. */
    private String field;

    /** Comparison operator (e.g. EQ, GT, CONTAINS). */
    private String operator;

    private Object value;
}
