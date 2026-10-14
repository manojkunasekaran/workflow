package com.app.common.model.task.parameters;

import com.app.common.model.form.FormSchema;
import lombok.Data;

@Data
public class FormPageTaskParameters implements TaskParameters {
    private FormSchema page;
}
