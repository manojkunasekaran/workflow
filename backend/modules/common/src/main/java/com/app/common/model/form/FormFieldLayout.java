package com.app.common.model.form;

import lombok.Data;

/** Grid placement when page layoutMode is GRID (12-column grid). */
@Data
public class FormFieldLayout {
    private int x;
    private int y;
    private int w = 12;
    private int h = 1;
}
