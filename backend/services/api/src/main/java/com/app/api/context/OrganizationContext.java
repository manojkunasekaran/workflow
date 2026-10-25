package com.app.api.context;

import com.app.common.exception.ValidationException;

/** Request-scoped active organization for the current call (session or dev header). */
public final class OrganizationContext {

    private static final ThreadLocal<String> CURRENT = new ThreadLocal<>();

    private OrganizationContext() {}

    public static void setOrganizationId(String organizationId) {
        CURRENT.set(organizationId);
    }

    public static String getOrganizationId() {
        return CURRENT.get();
    }

    public static String requireOrganizationId() {
        String id = CURRENT.get();
        if (id == null || id.isBlank()) {
            throw new ValidationException("Missing organization context. Sign in and select an organization.");
        }
        return id;
    }

    public static void clear() {
        CURRENT.remove();
    }
}
