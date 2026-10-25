package com.app.api.service.settings;

import com.app.api.dto.OrgAppearanceUpdateRequest;
import com.app.api.service.organization.OrganizationAccess;
import com.app.common.entity.Organization;
import com.app.persistence.repository.OrganizationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OrgAppearanceServiceTest {

    private OrganizationRepository organizationRepository;
    private OrganizationAccess organizationAccess;
    private OrgAppearanceService service;
    private Organization org;

    @BeforeEach
    void setUp() {
        organizationRepository = mock(OrganizationRepository.class);
        organizationAccess = mock(OrganizationAccess.class);
        service = new OrgAppearanceService(organizationRepository, organizationAccess, new ObjectMapper());
        org = new Organization();
        org.setId("org-1");
        org.setName("Test");
        org.setSettings(new HashMap<>());
        when(organizationAccess.requireOrganization()).thenReturn(org);
        when(organizationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void getReturnsDefaultsWhenMissing() {
        assertThat(service.getAppearance().getAccentPresetId()).isEqualTo("default");
        assertThat(service.getAppearance().isLockAccent()).isFalse();
    }

    @Test
    void updatePersistsPreset() {
        OrgAppearanceUpdateRequest req = new OrgAppearanceUpdateRequest();
        req.setAccentPresetId("blue");
        req.setLockAccent(true);
        var response = service.updateAppearance(req);
        assertThat(response.getAccentPresetId()).isEqualTo("blue");
        assertThat(response.isLockAccent()).isTrue();
    }
}
