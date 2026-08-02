package com.app.crypto.util;

import com.app.crypto.config.properties.CryptoProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int TAG_LENGTH_BIT = 128;
    private static final int IV_LENGTH_BYTE = 12;

    private final CryptoProperties cryptoProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    public String encrypt(String rawValue) {
        if (rawValue == null || rawValue.isEmpty()) {
            return rawValue;
        }

        try {
            byte[] iv = new byte[IV_LENGTH_BYTE];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
            SecretKeySpec keySpec = getSecretKeySpec();

            cipher.init(Cipher.ENCRYPT_MODE, keySpec, parameterSpec);
            byte[] encrypted = cipher.doFinal(rawValue.getBytes());

            ByteBuffer byteBuffer = ByteBuffer.allocate(iv.length + encrypted.length);
            byteBuffer.put(iv);
            byteBuffer.put(encrypted);

            return Base64.getEncoder().encodeToString(byteBuffer.array());
        } catch (Exception e) {
            log.error("Failed to encrypt value", e);
            throw new RuntimeException("Encryption failed", e);
        }
    }

    public String decrypt(String encryptedValue) {
        if (encryptedValue == null || encryptedValue.isEmpty()) {
            return encryptedValue;
        }

        try {
            byte[] decoded = Base64.getDecoder().decode(encryptedValue);

            ByteBuffer byteBuffer = ByteBuffer.wrap(decoded);
            byte[] iv = new byte[IV_LENGTH_BYTE];
            byteBuffer.get(iv);

            byte[] encrypted = new byte[byteBuffer.remaining()];
            byteBuffer.get(encrypted);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
            SecretKeySpec keySpec = getSecretKeySpec();

            cipher.init(Cipher.DECRYPT_MODE, keySpec, parameterSpec);
            byte[] decrypted = cipher.doFinal(encrypted);

            return new String(decrypted);
        } catch (Exception e) {
            log.error("Failed to decrypt value", e);
            throw new RuntimeException("Decryption failed", e);
        }
    }

    public Map<String, String> encryptMap(Map<String, String> rawMap) {
        if (rawMap == null) return null;
        Map<String, String> encryptedMap = new HashMap<>();
        rawMap.forEach((k, v) -> encryptedMap.put(k, encrypt(v)));
        return encryptedMap;
    }

    public Map<String, String> decryptMap(Map<String, String> encryptedMap) {
        if (encryptedMap == null) return null;
        Map<String, String> decryptedMap = new HashMap<>();
        encryptedMap.forEach((k, v) -> decryptedMap.put(k, decrypt(v)));
        return decryptedMap;
    }

    private SecretKeySpec getSecretKeySpec() {
        String base64Key = cryptoProperties.getEncryptionKey();
        if (base64Key == null || base64Key.isBlank()) {
            throw new IllegalStateException("Encryption key is missing. Ensure workflow.crypto.encryption-key is set in application.properties or via ENCRYPTION_KEY environment variable.");
        }
        byte[] keyBytes = Base64.getDecoder().decode(base64Key);
        if (keyBytes.length != 32) {
            throw new IllegalStateException("Encryption key must be 32 bytes (256-bit) after base64 decoding.");
        }
        return new SecretKeySpec(keyBytes, "AES");
    }
}
