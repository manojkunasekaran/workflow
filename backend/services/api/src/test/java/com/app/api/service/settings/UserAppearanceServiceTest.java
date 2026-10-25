package com.app.api.service.settings;

import com.app.api.dto.UserAppearancePatchRequest;
import com.app.api.service.organization.OrganizationAccess;
import com.app.common.entity.Organization;
import com.app.persistence.repository.OrganizationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class UserAppearanceServiceTest {

    private OrganizationRepository organizationRepository;
    private OrganizationAccess organizationAccess;
    private UserAppearanceService service;
    private Organization org;

    @BeforeEach
    void setUp() {
        organizationRepository = mock(OrganizationRepository.class);
        organizationAccess = mock(OrganizationAccess.class);
        service = new UserAppearanceService(organizationRepository, organizationAccess, new ObjectMapper());
        org = new Organization();
        org.setId("org-1");
        org.setName("Test");
        org.setSettings(new HashMap<>());
        when(organizationAccess.requireOrganization()).thenReturn(org);
    }

    @Test
    void getReturnsDefaultsWhenMissing() {
        assertThat(service.getAppearance().getThemeMode()).isEqualTo("system");
        assertThat(service.getAppearance().getAccentPresetId()).isEqualTo("default");
    }

    @Test
    void patchPersistsFields() {
        when(organizationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UserAppearancePatchRequest req = new UserAppearancePatchRequest();
        req.setThemeMode("dark");
        req.setDensity("compact");

        var response = service.patchAppearance(req);
        assertThat(response.getThemeMode()).isEqualTo("dark");
        assertThat(response.getDensity()).isEqualTo("compact");
    }
}
