package com.app.api.service.mcp;

import com.app.api.config.properties.WorkflowApiProperties;
import com.app.api.dto.McpRegenerateTokenResponse;
import com.app.api.dto.McpSettingsResponse;
import com.app.api.dto.McpSettingsUpdateRequest;
import com.app.common.entity.Organization;
import com.app.common.exception.ValidationException;
import com.app.common.model.settings.McpSettings;
import com.app.common.model.trigger.McpExposureMode;
import com.app.crypto.util.EncryptionService;
import com.app.persistence.repository.OrganizationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class McpSettingsService {

    static final String DEFAULT_ORG_ID = "default-org";
    static final String SETTINGS_KEY = "mcp";
    private static final String TOKEN_PREFIX = "mcp_";

    private final OrganizationRepository organizationRepository;
    private final WorkflowApiProperties apiProperties;
    private final ObjectMapper objectMapper;
    private final EncryptionService encryptionService;
    private final SecureRandom secureRandom = new SecureRandom();

    public McpSettingsResponse getSettings() {
        McpSettings settings = loadSettings();
        return toResponse(settings);
    }

    public McpSettingsResponse updateSettings(McpSettingsUpdateRequest request) {
        McpSettings current = loadSettings();

        if (request.getEnabled() != null) {
            if (request.getEnabled() && !hasConfiguredToken(current)) {
                throw new ValidationException(
                        "MCP server requires an auth token before it can be enabled. Regenerate a token first.");
            }
            current.setEnabled(request.getEnabled());
        }
        if (request.getExposureMode() != null) {
            current.setExposureMode(request.getExposureMode());
        }
        if (request.getGlobalEndpointPath() != null) {
            String path = request.getGlobalEndpointPath().trim();
            if (!path.startsWith("/")) {
                throw new ValidationException("globalEndpointPath must start with /");
            }
            current.setGlobalEndpointPath(path);
        }
        if (request.getAllowStdioTransport() != null) {
            current.setAllowStdioTransport(request.getAllowStdioTransport());
        }

        saveSettings(current);
        return toResponse(current);
    }

    public McpRegenerateTokenResponse regenerateToken() {
        McpSettings current = loadSettings();
        String plaintext = generateToken();
        current.setAuthTokenEncrypted(encryptionService.encrypt(plaintext));
        saveSettings(current);
        return McpRegenerateTokenResponse.builder().token(plaintext).build();
    }

    public McpSettings getEffectiveSettings() {
        return loadSettings();
    }

    public boolean isServerEnabled() {
        return loadSettings().isEnabled();
    }

    public boolean isStdioTransportAllowed() {
        return loadSettings().isAllowStdioTransport();
    }

    public boolean hasConfiguredToken() {
        return hasConfiguredToken(loadSettings());
    }

    public boolean validateBearerToken(String bearerToken) {
        if (bearerToken == null || bearerToken.isBlank()) {
            return false;
        }
        McpSettings settings = loadSettings();
        if (!hasConfiguredToken(settings)) {
            return false;
        }
        String expected = decryptToken(settings.getAuthTokenEncrypted());
        return constantTimeEquals(expected, bearerToken.trim());
    }

    private McpSettings loadSettings() {
        Organization org = organizationRepository.findById(DEFAULT_ORG_ID)
                .orElseGet(this::createDefaultOrganization);

        Object raw = org.getSettings() != null ? org.getSettings().get(SETTINGS_KEY) : null;
        if (raw == null) {
            return defaultSettings();
        }
        return objectMapper.convertValue(raw, McpSettings.class);
    }

    private void saveSettings(McpSettings settings) {
        Organization org = organizationRepository.findById(DEFAULT_ORG_ID)
                .orElseGet(this::createDefaultOrganization);

        Map<String, Object> settingsMap = org.getSettings() != null
                ? new HashMap<>(org.getSettings())
                : new HashMap<>();
        settingsMap.put(SETTINGS_KEY, settings);
        org.setSettings(settingsMap);
        organizationRepository.save(org);
    }

    private Organization createDefaultOrganization() {
        Organization org = new Organization();
        org.setId(DEFAULT_ORG_ID);
        org.setName("Default Organization");
        org.setSettings(new HashMap<>());
        return organizationRepository.save(org);
    }

    private McpSettings defaultSettings() {
        return McpSettings.builder()
                .enabled(false)
                .exposureMode(McpExposureMode.BOTH)
                .globalEndpointPath("/mcp")
                .allowStdioTransport(false)
                .build();
    }

    private McpSettingsResponse toResponse(McpSettings settings) {
        String base = normalizeBaseUrl(apiProperties.getWebhook().getPublicBaseUrl());
        String globalPath = normalizePath(settings.getGlobalEndpointPath());

        return McpSettingsResponse.builder()
                .enabled(settings.isEnabled())
                .exposureMode(settings.getExposureMode())
                .globalEndpointPath(globalPath)
                .globalEndpointUrl(base + globalPath)
                .authTokenMasked(maskToken(settings.getAuthTokenEncrypted()))
                .hasAuthToken(hasConfiguredToken(settings))
                .allowStdioTransport(settings.isAllowStdioTransport())
                .build();
    }

    private boolean hasConfiguredToken(McpSettings settings) {
        return settings.getAuthTokenEncrypted() != null && !settings.getAuthTokenEncrypted().isBlank();
    }

    private String maskToken(String encryptedToken) {
        if (encryptedToken == null || encryptedToken.isBlank()) {
            return null;
        }
        try {
            String plaintext = decryptToken(encryptedToken);
            if (plaintext.length() <= 4) {
                return TOKEN_PREFIX + "****";
            }
            return TOKEN_PREFIX + "****" + plaintext.substring(plaintext.length() - 4);
        } catch (RuntimeException e) {
            return TOKEN_PREFIX + "****";
        }
    }

    private String decryptToken(String encryptedToken) {
        return encryptionService.decrypt(encryptedToken);
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return TOKEN_PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private boolean constantTimeEquals(String expected, String actual) {
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                actual.getBytes(StandardCharsets.UTF_8));
    }

    private String normalizeBaseUrl(String base) {
        if (base == null || base.isBlank()) {
            return "http://localhost:8080/rest";
        }
        return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
    }

    private String normalizePath(String path) {
        if (path == null || path.isBlank()) {
            return "/mcp";
        }
        return path.startsWith("/") ? path : "/" + path;
    }
}
