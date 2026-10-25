package com.app.common.model.task.parameters;

import com.app.common.model.form.FormSchema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FormTaskParameters implements TaskParameters {

    public enum EndType {
        MESSAGE,
        REDIRECT,
        CUSTOM_HTML
    }

    private FormSchema page;
    private EndType endType;
    private String message;
    private String redirectUrl;
    private String customHtml;
}
