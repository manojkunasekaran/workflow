package com.app.api.service.settings;

import com.app.api.dto.OrgAppearanceResponse;
import com.app.api.dto.OrgAppearanceUpdateRequest;
import com.app.api.service.organization.OrganizationAccess;
import com.app.common.entity.Organization;
import com.app.common.exception.ValidationException;
import com.app.common.model.settings.OrgAppearanceSettings;
import com.app.persistence.repository.OrganizationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class OrgAppearanceService {

    static final String SETTINGS_KEY = "appearance";

    private static final Set<String> ALLOWED_PRESETS = Set.of(
            "default", "blue", "teal", "violet", "slate");

    private final OrganizationRepository organizationRepository;
    private final OrganizationAccess organizationAccess;
    private final ObjectMapper objectMapper;

    public OrgAppearanceResponse getAppearance() {
        return toResponse(loadSettings());
    }

    public OrgAppearanceResponse updateAppearance(OrgAppearanceUpdateRequest request) {
        OrgAppearanceSettings current = loadSettings();
        if (request.getAccentPresetId() != null) {
            String preset = request.getAccentPresetId().trim();
            if (!ALLOWED_PRESETS.contains(preset)) {
                throw new ValidationException("accentPresetId must be one of: " + ALLOWED_PRESETS);
            }
            current.setAccentPresetId(preset);
        }
        if (request.getLogoUrl() != null) {
            validateLogoUrl(request.getLogoUrl());
            current.setLogoUrl(request.getLogoUrl().isBlank() ? null : request.getLogoUrl().trim());
        }
        if (request.getLockAccent() != null) {
            current.setLockAccent(request.getLockAccent());
        }
        saveSettings(current);
        return toResponse(current);
    }

    private void validateLogoUrl(String url) {
        if (url.isBlank()) {
            return;
        }
        try {
            URI uri = URI.create(url.trim());
            String scheme = uri.getScheme();
            if (scheme == null || (!scheme.equalsIgnoreCase("https") && !scheme.equalsIgnoreCase("http"))) {
                throw new ValidationException("logoUrl must use http or https");
            }
        } catch (IllegalArgumentException e) {
            throw new ValidationException("logoUrl is not a valid URL");
        }
    }

    private OrgAppearanceSettings loadSettings() {
        Organization org = organizationAccess.requireOrganization();
        Object raw = org.getSettings() != null ? org.getSettings().get(SETTINGS_KEY) : null;
        if (raw == null) {
            return defaultSettings();
        }
        return objectMapper.convertValue(raw, OrgAppearanceSettings.class);
    }

    private void saveSettings(OrgAppearanceSettings settings) {
        Organization org = organizationAccess.requireOrganization();
        Map<String, Object> settingsMap = org.getSettings() != null
                ? new HashMap<>(org.getSettings())
                : new HashMap<>();
        settingsMap.put(SETTINGS_KEY, settings);
        org.setSettings(settingsMap);
        organizationRepository.save(org);
    }

    private OrgAppearanceSettings defaultSettings() {
        return OrgAppearanceSettings.builder()
                .accentPresetId("default")
                .logoUrl(null)
                .lockAccent(false)
                .build();
    }

    private OrgAppearanceResponse toResponse(OrgAppearanceSettings settings) {
        return OrgAppearanceResponse.builder()
                .accentPresetId(settings.getAccentPresetId())
                .logoUrl(settings.getLogoUrl())
                .lockAccent(settings.isLockAccent())
                .build();
    }
}
