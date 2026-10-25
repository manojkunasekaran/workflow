package com.app.common.connector;

public enum ConnectorScope {
    /** Platform-wide connector definition. */
    SYSTEM,
    /** Organization-specific connector override or custom app. */
    ORGANIZATION,
    /** Backward compatibility alias for legacy MongoDB connector records. */
    TENANT
}
