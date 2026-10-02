package com.app.api.service;

import com.app.common.constant.IntegrationCredentialTypes;
import com.app.common.entity.IntegrationCredential;
import com.app.common.entity.McpTransport;
import com.app.crypto.util.EncryptionService;
import com.app.api.service.mcp.McpSettingsService;
import com.app.capability.mcp.api.McpToolDiscoveryService;
import com.app.persistence.connector.ConnectorRegistry;
import com.app.persistence.repository.IntegrationCredentialRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

// Should read the rules before creating/updating the test files
@ExtendWith(MockitoExtension.class)
public class IntegrationCredentialServiceTest {

    @Mock
    private IntegrationCredentialRepository repository;

    @Mock
    private EncryptionService encryptionService;

    @Mock
    private ConnectorRegistry connectorRegistry;

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private McpToolDiscoveryService mcpToolDiscoveryService;

    @Mock
    private McpSettingsService mcpSettingsService;

    @InjectMocks
    private IntegrationCredentialService service;

    private IntegrationCredential credential;

    @BeforeEach
    void setUp() {
        credential = new IntegrationCredential();
        credential.setId("cred-123");
        credential.setOrganizationId("default-org");
        credential.setName("Test Cred");
        credential.setType("SMTP");
        
        Map<String, String> creds = new HashMap<>();
        creds.put("password", "secret123");
        credential.setCredentials(creds);
    }

    @Test
    void createCredential_shouldEncryptCredentialsAndReturnMasked() {
        when(encryptionService.encryptMap(anyMap())).thenAnswer(inv -> {
            Map<String, String> original = inv.getArgument(0);
            Map<String, String> encrypted = new HashMap<>();
            original.forEach((k, v) -> encrypted.put(k, "enc_" + v));
            return encrypted;
        });
        
        when(repository.save(any(IntegrationCredential.class))).thenAnswer(inv -> inv.getArgument(0));

        IntegrationCredential result = service.createCredential(credential);

        assertNotNull(result.getId());
        assertEquals("default-org", result.getOrganizationId());
        
        // Ensure result is masked
        assertNotNull(result.getCredentials());
        assertEquals("********", result.getCredentials().get("password"));
        
        verify(encryptionService).encryptMap(anyMap());
        verify(repository).save(any(IntegrationCredential.class));
    }

    @Test
    void updateCredential_shouldEncryptOnlyUnmaskedFields() {
        IntegrationCredential existing = new IntegrationCredential();
        existing.setId("cred-123");
        existing.setOrganizationId("default-org");
        existing.setName("Old Name");
        
        Map<String, String> existingCreds = new HashMap<>();
        existingCreds.put("password", "enc_secret");
        existingCreds.put("host", "enc_host");
        existing.setCredentials(existingCreds);
        
        when(repository.findById("cred-123")).thenReturn(Optional.of(existing));
        when(repository.save(any(IntegrationCredential.class))).thenAnswer(inv -> inv.getArgument(0));
        when(encryptionService.encrypt("new_secret")).thenReturn("enc_new_secret");

        IntegrationCredential updateReq = new IntegrationCredential();
        updateReq.setName("New Name");
        Map<String, String> updatedCreds = new HashMap<>();
        updatedCreds.put("password", "new_secret"); // Changed
        updatedCreds.put("host", "********"); // Unchanged
        updateReq.setCredentials(updatedCreds);

        IntegrationCredential result = service.updateCredential("cred-123", updateReq);

        assertEquals("New Name", result.getName());
        assertEquals("********", result.getCredentials().get("password"));
        assertEquals("********", result.getCredentials().get("host"));
        
        // Verify what was actually saved
        verify(repository).save(argThat(c -> {
            return c.getCredentials().get("password").equals("enc_new_secret") &&
                   c.getCredentials().get("host").equals("enc_host");
        }));
    }

    @Test
    void getAllCredentials_shouldReturnMaskedList() {
        credential.setOrganizationId("default-org");
        when(repository.findByOrganizationId("default-org")).thenReturn(List.of(credential));
        
        List<IntegrationCredential> results = service.getAllCredentials();
        
        assertEquals(1, results.size());
        assertEquals("********", results.get(0).getCredentials().get("password"));
    }

    @Test
    void deleteCredential_shouldDeleteIfExists() {
        when(repository.findById("cred-123")).thenReturn(Optional.of(credential));
        
        service.deleteCredential("cred-123");
        
        verify(repository).delete(credential);
    }

    @Test
    void createCredential_shouldRejectMcpServerWithoutUrl() {
        IntegrationCredential mcpCredential = new IntegrationCredential();
        mcpCredential.setName("MCP");
        mcpCredential.setType(IntegrationCredentialTypes.MCP_SERVER);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.createCredential(mcpCredential));

        assertEquals("MCP server URL is required", ex.getMessage());
    }

    @Test
    void createCredential_shouldRejectInvalidMcpServerUrl() {
        IntegrationCredential mcpCredential = new IntegrationCredential();
        mcpCredential.setName("MCP");
        mcpCredential.setType(IntegrationCredentialTypes.MCP_SERVER);
        mcpCredential.setMcpServerUrl("ftp://bad.example.com");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.createCredential(mcpCredential));

        assertEquals("MCP server URL must use http or https", ex.getMessage());
    }

    @Test
    void createCredential_shouldApplyMcpDefaults() {
        IntegrationCredential mcpCredential = new IntegrationCredential();
        mcpCredential.setName("MCP");
        mcpCredential.setType(IntegrationCredentialTypes.MCP_SERVER);
        mcpCredential.setMcpServerUrl("https://mcp.example.com");

        when(repository.save(any(IntegrationCredential.class))).thenAnswer(inv -> inv.getArgument(0));

        IntegrationCredential result = service.createCredential(mcpCredential);

        assertEquals("/mcp", result.getMcpEndpointPath());
        assertEquals(McpTransport.STREAMABLE_HTTP, result.getMcpTransport());
    }

    @Test
    void createCredential_shouldRejectStdioWhenDisabledInSettings() {
        IntegrationCredential mcpCredential = new IntegrationCredential();
        mcpCredential.setName("MCP Stdio");
        mcpCredential.setType(IntegrationCredentialTypes.MCP_SERVER);
        mcpCredential.setMcpTransport(McpTransport.STDIO);
        mcpCredential.setMcpStdioCommand("npx");

        when(mcpSettingsService.isStdioTransportAllowed()).thenReturn(false);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.createCredential(mcpCredential));

        assertEquals("STDIO transport is disabled in MCP settings", ex.getMessage());
    }

    @Test
    void createCredential_shouldAcceptStdioWhenEnabledInSettings() {
        IntegrationCredential mcpCredential = new IntegrationCredential();
        mcpCredential.setName("MCP Stdio");
        mcpCredential.setType(IntegrationCredentialTypes.MCP_SERVER);
        mcpCredential.setMcpTransport(McpTransport.STDIO);
        mcpCredential.setMcpStdioCommand("npx");
        mcpCredential.setMcpStdioArgs(List.of("-y", "@modelcontextprotocol/server-everything"));

        when(mcpSettingsService.isStdioTransportAllowed()).thenReturn(true);
        when(repository.save(any(IntegrationCredential.class))).thenAnswer(inv -> inv.getArgument(0));

        IntegrationCredential result = service.createCredential(mcpCredential);

        assertEquals("npx", result.getMcpStdioCommand());
        assertEquals(List.of("-y", "@modelcontextprotocol/server-everything"), result.getMcpStdioArgs());
    }
}



