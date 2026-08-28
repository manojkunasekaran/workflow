package com.app.api.service;

import com.app.common.connector.ConnectorManifest;
import com.app.common.connector.ConnectorScope;
import com.app.persistence.connector.ConnectorRegistry;
import com.app.persistence.entity.ConnectorManifestEntity;
import com.app.persistence.repository.ConnectorManifestRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ConnectorServiceTest {

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private ConnectorManifestRepository repository;

    @Mock
    private Environment environment;

    @InjectMocks
    private ConnectorRegistry connectorRegistry;

    private ConnectorManifestEntity systemEntity;
    private ConnectorManifestEntity tenantEntity;

    @BeforeEach
    void setUp() {
        systemEntity = new ConnectorManifestEntity();
        systemEntity.setId("sys-id");
        systemEntity.setConnectorId("jira");
        systemEntity.setScope(ConnectorScope.SYSTEM);
        systemEntity.setEnabled(true);

        tenantEntity = new ConnectorManifestEntity();
        tenantEntity.setId("ten-id");
        tenantEntity.setConnectorId("jira");
        tenantEntity.setScope(ConnectorScope.TENANT);
        tenantEntity.setOrganizationId("org-1");
        tenantEntity.setEnabled(true);
    }

    @Test
    void testFindById_SystemScopeFallback() {
        when(repository.findByConnectorIdAndScopeAndOrganizationId("jira", ConnectorScope.SYSTEM, null))
                .thenReturn(Optional.of(systemEntity));

        Optional<ConnectorManifest> result = connectorRegistry.findById("jira");

        assertTrue(result.isPresent());
        assertEquals(ConnectorScope.SYSTEM, result.get().getScope());
    }

    @Test
    void testFindById_TenantScopeOverride() {
        when(repository.findByConnectorIdAndScopeAndOrganizationId("jira", ConnectorScope.TENANT, "org-1"))
                .thenReturn(Optional.of(tenantEntity));

        Optional<ConnectorManifest> result = connectorRegistry.findById("jira", "org-1");

        assertTrue(result.isPresent());
        assertEquals(ConnectorScope.TENANT, result.get().getScope());
        assertEquals("org-1", result.get().getOrganizationId());
    }

    @Test
    void testFindById_TenantDisabledFallbackToSystem() {
        tenantEntity.setEnabled(false);
        when(repository.findByConnectorIdAndScopeAndOrganizationId("jira", ConnectorScope.TENANT, "org-1"))
                .thenReturn(Optional.of(tenantEntity));
        when(repository.findByConnectorIdAndScopeAndOrganizationId("jira", ConnectorScope.SYSTEM, null))
                .thenReturn(Optional.of(systemEntity));

        Optional<ConnectorManifest> result = connectorRegistry.findById("jira", "org-1");

        assertTrue(result.isPresent());
        assertEquals(ConnectorScope.SYSTEM, result.get().getScope());
    }

    @Test
    void testFindById_NotFound() {
        when(repository.findByConnectorIdAndScopeAndOrganizationId("unknown", ConnectorScope.SYSTEM, null))
                .thenReturn(Optional.empty());

        Optional<ConnectorManifest> result = connectorRegistry.findById("unknown");

        assertFalse(result.isPresent());
    }

    @Test
    void testListAll_Global() {
        when(repository.findAll()).thenReturn(Arrays.asList(systemEntity, tenantEntity));

        List<ConnectorManifest> result = connectorRegistry.listAll();

        assertEquals(2, result.size());
    }

    @Test
    void testListAll_WithOrgMerge() {
        when(repository.findByScope(ConnectorScope.SYSTEM)).thenReturn(Collections.singletonList(systemEntity));
        when(repository.findByOrganizationId("org-1")).thenReturn(Collections.singletonList(tenantEntity));

        List<ConnectorManifest> result = connectorRegistry.listAll("org-1");

        assertEquals(1, result.size());
        assertEquals(ConnectorScope.TENANT, result.get(0).getScope());
    }

    @Test
    void testListAll_WithOrgMerge_DifferentConnectors() {
        systemEntity.setConnectorId("slack");
        when(repository.findByScope(ConnectorScope.SYSTEM)).thenReturn(Collections.singletonList(systemEntity));
        when(repository.findByOrganizationId("org-1")).thenReturn(Collections.singletonList(tenantEntity));

        List<ConnectorManifest> result = connectorRegistry.listAll("org-1");

        assertEquals(2, result.size());
    }

    @Test
    void testSave_NewEntity() {
        ConnectorManifest manifest = new ConnectorManifest();
        manifest.setConnectorId("custom");
        manifest.setOrganizationId("org-1");

        when(repository.save(any(ConnectorManifestEntity.class))).thenAnswer(i -> {
            ConnectorManifestEntity e = i.getArgument(0);
            e.setId("new-id");
            return e;
        });

        ConnectorManifest result = connectorRegistry.save(manifest);

        assertNotNull(result.getId());
        assertEquals("new-id", result.getId());
        assertEquals(ConnectorScope.TENANT, result.getScope());
        verify(repository).save(any(ConnectorManifestEntity.class));
    }

    @Test
    void testSave_UpdateExisting() {
        ConnectorManifest manifest = new ConnectorManifest();
        manifest.setId("ten-id");
        manifest.setConnectorId("jira");
        manifest.setOrganizationId("org-1");

        when(repository.findById("ten-id")).thenReturn(Optional.of(tenantEntity));
        when(repository.save(any(ConnectorManifestEntity.class))).thenReturn(tenantEntity);

        ConnectorManifest result = connectorRegistry.save(manifest);

        assertEquals("ten-id", result.getId());
        verify(repository).findById("ten-id");
    }

    @Test
    void testSave_UpdateNonExistent_ThrowsException() {
        ConnectorManifest manifest = new ConnectorManifest();
        manifest.setId("invalid-id");

        when(repository.findById("invalid-id")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> connectorRegistry.save(manifest));
    }

    @Test
    void testDelete() {
        connectorRegistry.delete("some-id");
        verify(repository).deleteById("some-id");
    }
}
