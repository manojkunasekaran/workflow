package com.app.crypto.util;

import com.app.crypto.config.properties.CryptoProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EncryptionServiceTest {

    private EncryptionService encryptionService;

    @BeforeEach
    void setUp() {
        CryptoProperties properties = new CryptoProperties();
        // Generate a random 32-byte key dynamically for testing
        byte[] keyBytes = new byte[32];
        new java.security.SecureRandom().nextBytes(keyBytes);
        properties.setEncryptionKey(java.util.Base64.getEncoder().encodeToString(keyBytes));
        encryptionService = new EncryptionService(properties);
    }

    @Test
    void testEncryptDecrypt() {
        String plainText = "MySuperSecretPassword123!";
        String encrypted = encryptionService.encrypt(plainText);
        
        assertThat(encrypted).isNotEqualTo(plainText);
        assertThat(encrypted).isNotBlank();
        
        String decrypted = encryptionService.decrypt(encrypted);
        assertThat(decrypted).isEqualTo(plainText);
    }

    @Test
    void testEncryptDecryptMap() {
        Map<String, String> rawMap = Map.of(
            "password", "secret",
            "token", "bearer_abc123"
        );
        
        Map<String, String> encryptedMap = encryptionService.encryptMap(rawMap);
        assertThat(encryptedMap).isNotNull();
        assertThat(encryptedMap.get("password")).isNotEqualTo("secret");
        
        Map<String, String> decryptedMap = encryptionService.decryptMap(encryptedMap);
        assertThat(decryptedMap).isEqualTo(rawMap);
    }

    @Test
    void testInvalidKeyLengthThrowsException() {
        CryptoProperties invalidProps = new CryptoProperties();
        invalidProps.setEncryptionKey("shortkey");
        EncryptionService invalidService = new EncryptionService(invalidProps);
        
        assertThatThrownBy(() -> invalidService.encrypt("test"))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Encryption failed");
    }
}
