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

    @Test
    void resolveCredential_withMatchingOrganization_shouldReturnCredential() {
        IntegrationCredential credential = new IntegrationCredential();
        credential.setId("cred-tenant");
        credential.setOrganizationId("org-alpha");
        credential.setCredentials(Map.of("token", "enc_tok123"));

        when(repository.findById("cred-tenant")).thenReturn(Optional.of(credential));
        when(encryptionService.decryptMap(anyMap())).thenAnswer(inv -> Map.of("token", "tok123"));

        com.app.core.model.ExecutionContext context = com.app.core.model.ExecutionContext.builder()
                .organizationId("org-alpha")
                .build();

        Optional<IntegrationCredential> result = provider.resolveCredential("cred-tenant", null, context);

        assertTrue(result.isPresent());
        assertEquals("tok123", result.get().getCredentials().get("token"));
    }

    @Test
    void resolveCredential_withMismatchedOrganization_shouldDenyAccess() {
        IntegrationCredential credential = new IntegrationCredential();
        credential.setId("cred-tenant");
        credential.setOrganizationId("org-alpha");
        credential.setCredentials(Map.of("token", "enc_tok123"));

        when(repository.findById("cred-tenant")).thenReturn(Optional.of(credential));

        com.app.core.model.ExecutionContext context = com.app.core.model.ExecutionContext.builder()
                .organizationId("org-beta")
                .build();

        Optional<IntegrationCredential> result = provider.resolveCredential("cred-tenant", null, context);

        assertTrue(result.isEmpty());
    }

    @Test
    void resolveCredential_withPlatformScope_shouldAllowAccessAcrossOrgs() {
        IntegrationCredential credential = new IntegrationCredential();
        credential.setId("cred-platform");
        credential.setCredentialScope(com.app.common.entity.CredentialScope.PLATFORM);
        credential.setCredentials(Map.of("apiKey", "enc_platKey"));

        when(repository.findById("cred-platform")).thenReturn(Optional.of(credential));
        when(encryptionService.decryptMap(anyMap())).thenAnswer(inv -> Map.of("apiKey", "platKey"));

        com.app.core.model.ExecutionContext context = com.app.core.model.ExecutionContext.builder()
                .organizationId("org-any")
                .build();

        Optional<IntegrationCredential> result = provider.resolveCredential("cred-platform", null, context);

        assertTrue(result.isPresent());
        assertEquals("platKey", result.get().getCredentials().get("apiKey"));
    }
}
