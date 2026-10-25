package com.app.common.model.form;

import com.app.common.model.trigger.FormEnvironment;

/** Normalizes public form slugs to persisted registration slugs. */
public final class FormSlugUtils {

    private FormSlugUtils() {}

    public static String normalizePublicSlug(String slug) {
        if (slug == null) {
            return "";
        }
        return slug.trim().toLowerCase().replaceAll("[^a-z0-9-]", "-");
    }

    public static String registrationSlug(String publicSlug, FormEnvironment environment) {
        String base = normalizePublicSlug(publicSlug);
        if (environment == FormEnvironment.TEST) {
            return base + "-test";
        }
        return base;
    }
}
