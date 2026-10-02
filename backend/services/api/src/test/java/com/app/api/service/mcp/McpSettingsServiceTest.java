package com.app.api.service.mcp;

import com.app.api.config.properties.WorkflowApiProperties;
import com.app.api.dto.McpSettingsUpdateRequest;
import com.app.common.entity.Organization;
import com.app.common.exception.ValidationException;
import com.app.common.model.trigger.McpExposureMode;
import com.app.crypto.util.EncryptionService;
import com.app.persistence.repository.OrganizationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class McpSettingsServiceTest {

    @Mock
    private OrganizationRepository organizationRepository;

    @Mock
    private EncryptionService encryptionService;

    private McpSettingsService service;

    @BeforeEach
    void setUp() {
        WorkflowApiProperties properties = new WorkflowApiProperties();
        service = new McpSettingsService(organizationRepository, properties, new ObjectMapper(), encryptionService);
    }

    @Test
    void getSettings_returnsDefaultsWhenOrgMissing() {
        when(organizationRepository.findById(McpSettingsService.DEFAULT_ORG_ID)).thenReturn(Optional.empty());
        when(organizationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var response = service.getSettings();

        assertFalse(response.isEnabled());
        assertEquals(McpExposureMode.BOTH, response.getExposureMode());
        assertEquals("/mcp", response.getGlobalEndpointPath());
    }

    @Test
    void updateSettings_persistsEnabledFlag() {
        Organization org = new Organization();
        org.setId(McpSettingsService.DEFAULT_ORG_ID);
        org.setSettings(new HashMap<>());

        when(organizationRepository.findById(McpSettingsService.DEFAULT_ORG_ID)).thenReturn(Optional.of(org));
        when(organizationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(encryptionService.encrypt(any())).thenReturn("enc_token");
        when(encryptionService.decrypt("enc_token")).thenReturn("mcp_testtoken1234");

        service.regenerateToken();

        McpSettingsUpdateRequest request = new McpSettingsUpdateRequest();
        request.setEnabled(true);
        request.setExposureMode(McpExposureMode.GLOBAL);

        var response = service.updateSettings(request);

        assertTrue(response.isEnabled());
        assertEquals(McpExposureMode.GLOBAL, response.getExposureMode());

        ArgumentCaptor<Organization> captor = ArgumentCaptor.forClass(Organization.class);
        verify(organizationRepository, atLeastOnce()).save(captor.capture());
        assertTrue(captor.getValue().getSettings().containsKey(McpSettingsService.SETTINGS_KEY));
    }

    @Test
    void updateSettings_rejectsEnableWithoutToken() {
        Organization org = new Organization();
        org.setId(McpSettingsService.DEFAULT_ORG_ID);
        org.setSettings(new HashMap<>());

        when(organizationRepository.findById(McpSettingsService.DEFAULT_ORG_ID)).thenReturn(Optional.of(org));

        McpSettingsUpdateRequest request = new McpSettingsUpdateRequest();
        request.setEnabled(true);

        assertThrows(ValidationException.class, () -> service.updateSettings(request));
    }

    @Test
    void regenerateToken_returnsPlaintextAndPersistsEncrypted() {
        Organization org = new Organization();
        org.setId(McpSettingsService.DEFAULT_ORG_ID);
        org.setSettings(new HashMap<>());

        when(organizationRepository.findById(McpSettingsService.DEFAULT_ORG_ID)).thenReturn(Optional.of(org));
        when(organizationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(encryptionService.encrypt(any())).thenAnswer(inv -> "enc_" + inv.getArgument(0));

        var response = service.regenerateToken();

        assertNotNull(response.getToken());
        assertTrue(response.getToken().startsWith("mcp_"));
        verify(encryptionService).encrypt(response.getToken());
    }
}
