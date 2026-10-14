package com.app.persistence.entity;

import com.app.common.constant.CollectionNames;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Platform-managed OAuth2 client credentials for a system connector (configured in admin UI, not properties files).
 */
@Data
@Document(collection = CollectionNames.CONNECTOR_OAUTH_PLATFORM_CONFIGS)
public class ConnectorOAuthPlatformConfigEntity {

    @Id
    private String id;

    @Indexed(unique = true)
    private String connectorId;

    /** Public OAuth client identifier (not encrypted). */
    private String clientId;

    /** AES-GCM encrypted client secret. */
    private String encryptedClientSecret;

    private boolean enabled = true;

    @LastModifiedDate
    private Instant updatedAt;
}
