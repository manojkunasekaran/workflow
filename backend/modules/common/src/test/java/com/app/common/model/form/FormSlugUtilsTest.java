package com.app.common.model.form;

import com.app.common.model.trigger.FormEnvironment;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class FormSlugUtilsTest {

    @Test
    void appendsTestSuffixForTestEnvironment() {
        assertEquals("contact-us-test", FormSlugUtils.registrationSlug("contact-us", FormEnvironment.TEST));
        assertEquals("contact-us", FormSlugUtils.registrationSlug("contact-us", FormEnvironment.PROD));
    }
}
