package com.app.core.service;

import com.app.common.entity.IntegrationCredential;
import com.app.crypto.util.EncryptionService;
import com.app.persistence.repository.IntegrationCredentialRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.when;

// Should read the rules before creating/updating the test files
@ExtendWith(MockitoExtension.class)
public class CredentialProviderTest {

    @Mock
    private IntegrationCredentialRepository repository;

    @Mock
    private EncryptionService encryptionService;

    @InjectMocks
    private CredentialProvider provider;

    @Test
    void getDecryptedCredential_shouldReturnEmptyForNullId() {
        assertTrue(provider.resolveCredential(null, null, null).isEmpty());
        assertTrue(provider.resolveCredential("", null, null).isEmpty());
    }

    @Test
    void getDecryptedCredential_shouldReturnDecryptedEntity() {
        IntegrationCredential credential = new IntegrationCredential();
        credential.setId("cred-123");
        
        Map<String, String> encryptedMap = new HashMap<>();
        encryptedMap.put("password", "enc_secret");
        credential.setCredentials(encryptedMap);
        
        when(repository.findById("cred-123")).thenReturn(Optional.of(credential));
        
        when(encryptionService.decryptMap(anyMap())).thenAnswer(inv -> {
            Map<String, String> original = inv.getArgument(0);
            Map<String, String> decrypted = new HashMap<>();
            original.forEach((k, v) -> decrypted.put(k, v.replace("enc_", "")));
            return decrypted;
        });

        Optional<IntegrationCredential> result = provider.resolveCredential("cred-123", null, null);

        assertTrue(result.isPresent());
        assertEquals("secret", result.get().getCredentials().get("password"));
    }
}
