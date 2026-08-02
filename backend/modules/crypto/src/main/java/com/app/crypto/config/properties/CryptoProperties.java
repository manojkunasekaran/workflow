package com.app.crypto.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "workflow.crypto")
public class CryptoProperties {
    
    /**
     * The AES-256-GCM encryption key used to encrypt credential maps.
     * Must be a 32-byte Base64 encoded string.
     */
    private String encryptionKey;
}
