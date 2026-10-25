package com.app.api.service.settings;

import com.app.api.dto.UserAppearancePatchRequest;
import com.app.api.dto.UserAppearanceResponse;
import com.app.api.service.organization.OrganizationAccess;
import com.app.common.entity.Organization;
import com.app.common.exception.ValidationException;
import com.app.common.model.settings.UserAppearanceSettings;
import com.app.persistence.repository.OrganizationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserAppearanceService {

    static final String SETTINGS_KEY = "userAppearance";

    private static final Set<String> THEME_MODES = Set.of("light", "dark", "system");
    private static final Set<String> ACCENT_PRESETS = Set.of(
            "default", "blue", "teal", "violet", "slate");
    private static final Set<String> DENSITIES = Set.of("comfortable", "compact");
    private static final Set<String> RADIUS = Set.of("sm", "md", "lg");

    private final OrganizationRepository organizationRepository;
    private final OrganizationAccess organizationAccess;
    private final ObjectMapper objectMapper;

    public UserAppearanceResponse getAppearance() {
        return toResponse(loadSettings());
    }

    public UserAppearanceResponse patchAppearance(UserAppearancePatchRequest request) {
        UserAppearanceSettings current = loadSettings();
        if (request.getThemeMode() != null) {
            String mode = request.getThemeMode().trim();
            if (!THEME_MODES.contains(mode)) {
                throw new ValidationException("themeMode must be one of: " + THEME_MODES);
            }
            current.setThemeMode(mode);
        }
        if (request.getAccentPresetId() != null) {
            String preset = request.getAccentPresetId().trim();
            if (!ACCENT_PRESETS.contains(preset)) {
                throw new ValidationException("accentPresetId must be one of: " + ACCENT_PRESETS);
            }
            current.setAccentPresetId(preset);
        }
        if (request.getDensity() != null) {
            String density = request.getDensity().trim();
            if (!DENSITIES.contains(density)) {
                throw new ValidationException("density must be one of: " + DENSITIES);
            }
            current.setDensity(density);
        }
        if (request.getRadiusPreset() != null) {
            String radius = request.getRadiusPreset().trim();
            if (!RADIUS.contains(radius)) {
                throw new ValidationException("radiusPreset must be one of: " + RADIUS);
            }
            current.setRadiusPreset(radius);
        }
        saveSettings(current);
        return toResponse(current);
    }

    private UserAppearanceSettings loadSettings() {
        Organization org = organizationAccess.requireOrganization();
        Object raw = org.getSettings() != null ? org.getSettings().get(SETTINGS_KEY) : null;
        if (raw == null) {
            return defaultSettings();
        }
        return objectMapper.convertValue(raw, UserAppearanceSettings.class);
    }

    private void saveSettings(UserAppearanceSettings settings) {
        Organization org = organizationAccess.requireOrganization();
        Map<String, Object> settingsMap = org.getSettings() != null
                ? new HashMap<>(org.getSettings())
                : new HashMap<>();
        settingsMap.put(SETTINGS_KEY, settings);
        org.setSettings(settingsMap);
        organizationRepository.save(org);
    }

    private UserAppearanceSettings defaultSettings() {
        return UserAppearanceSettings.builder()
                .themeMode("system")
                .accentPresetId("default")
                .density("comfortable")
                .radiusPreset("md")
                .build();
    }

    private UserAppearanceResponse toResponse(UserAppearanceSettings settings) {
        return UserAppearanceResponse.builder()
                .themeMode(settings.getThemeMode())
                .accentPresetId(settings.getAccentPresetId())
                .density(settings.getDensity())
                .radiusPreset(settings.getRadiusPreset())
                .build();
    }
}
