package com.app.common.model.form;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/** Reusable form layout — one page per FORM task or trigger landing page. */
@Data
public class FormSchema {
    private List<FormPageDefinition> pages = new ArrayList<>();

    public FormPageDefinition firstPage() {
        if (pages == null || pages.isEmpty()) {
            return null;
        }
        return pages.get(0);
    }
}
