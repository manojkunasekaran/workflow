package com.app.common.model.form;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class FormPageDefinition {
    private String pageId;
    private String title;
    private String descriptionHtml;
    private String submitButtonLabel;
    private FormLayoutMode layoutMode = FormLayoutMode.STACK;
    private List<FormFieldDefinition> fields = new ArrayList<>();
}
