package com.app.common.model.trigger;

import com.app.common.model.form.FormSchema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FormTriggerConfig {

    @Builder.Default
    private boolean active = true;

    /** URL slug segment (unique per org + environment). */
    private String slug;

    /** Landing page (step 0) field schema. */
    private FormSchema landingPage;

    @Builder.Default
    private FormAuthMode authMode = FormAuthMode.PUBLIC;

    private String completionMessage;

    private String redirectUrl;

    @Builder.Default
    private boolean captchaEnabled = false;
}
