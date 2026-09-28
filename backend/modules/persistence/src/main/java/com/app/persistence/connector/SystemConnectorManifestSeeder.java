package com.app.persistence.connector;

import com.app.common.connector.ConnectorManifest;
import com.app.common.connector.ConnectorScope;
import com.app.common.connector.ConnectorTriggerBundle;
import com.app.persistence.entity.ConnectorManifestEntity;
import com.app.persistence.repository.ConnectorManifestRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;

import java.io.InputStream;

/**
 * Seeds built-in connector manifests from classpath JSON into the database.
 * Invoked by {@link ConnectorManifestDeferredStartup}; not part of application bootstrap.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SystemConnectorManifestSeeder {

    private static final String MANIFEST_LOCATION = "classpath:connectors/*.json";
    private static final String TRIGGER_LOCATION_PREFIX = "classpath:connectors/triggers/";

    private final ObjectMapper objectMapper;
    private final ConnectorManifestRepository repository;

    /**
     * Upserts all system-scoped connector manifests found on the classpath.
     *
     * @throws RuntimeException when manifest discovery fails (individual manifest errors are logged and skipped)
     */
    public void seedSystemManifests() {
        log.info("Scanning classpath for system connector manifests...");
        try {
            PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources(MANIFEST_LOCATION);
            for (Resource resource : resources) {
                upsertManifest(resource, resolver);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to scan for connector manifests to seed", e);
        }
    }

    private void upsertManifest(Resource resource, PathMatchingResourcePatternResolver resolver) {
        try (InputStream inputStream = resource.getInputStream()) {
            ConnectorManifest manifest = objectMapper.readValue(inputStream, ConnectorManifest.class);
            mergeClasspathTriggers(manifest, resolver);

            ConnectorManifestEntity entity = repository
                    .findByConnectorIdAndScopeAndOrganizationId(
                            manifest.getConnectorId(), ConnectorScope.SYSTEM, null)
                    .orElse(new ConnectorManifestEntity());

            entity.setScope(ConnectorScope.SYSTEM);
            entity.setConnectorId(manifest.getConnectorId());
            entity.setDisplayName(manifest.getDisplayName());
            entity.setIcon(manifest.getIcon());
            entity.setCategory(manifest.getCategory());
            entity.setTaskType(manifest.getTaskType());
            entity.setBaseUrl(manifest.getBaseUrl());
            entity.setAuthType(manifest.getAuthType());
            entity.setAuthHeaderName(manifest.getAuthHeaderName());
            entity.setAuthHeaderPrefix(manifest.getAuthHeaderPrefix());
            entity.setOauth2Config(manifest.getOauth2Config());
            entity.setCredentialGuide(manifest.getCredentialGuide());
            entity.setConnectionSetup(manifest.getConnectionSetup());
            entity.setVerifyAction(manifest.getVerifyAction());
            entity.setActions(manifest.getActions());
            entity.setTriggers(manifest.getTriggers());
            if (entity.getId() == null) {
                entity.setEnabled(true);
            }

            repository.save(entity);
            log.info("Upserted system connector: {} ({} triggers)",
                    entity.getConnectorId(),
                    entity.getTriggers() != null ? entity.getTriggers().size() : 0);
        } catch (Exception e) {
            log.error("Failed to seed connector manifest: {}", resource.getFilename(), e);
        }
    }

    private void mergeClasspathTriggers(ConnectorManifest manifest, PathMatchingResourcePatternResolver resolver) {
        if (manifest.getTriggers() != null && !manifest.getTriggers().isEmpty()) {
            return;
        }
        try {
            Resource triggerResource = resolver.getResource(
                    TRIGGER_LOCATION_PREFIX + manifest.getConnectorId() + ".json");
            if (!triggerResource.exists()) {
                return;
            }
            try (InputStream triggerStream = triggerResource.getInputStream()) {
                ConnectorTriggerBundle bundle = objectMapper.readValue(triggerStream, ConnectorTriggerBundle.class);
                manifest.setTriggers(bundle.getTriggers());
            }
        } catch (Exception e) {
            log.error("Failed to load trigger presets for connector {}", manifest.getConnectorId(), e);
        }
    }
}
