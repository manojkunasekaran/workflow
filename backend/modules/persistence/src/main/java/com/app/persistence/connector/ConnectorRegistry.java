package com.app.persistence.connector;

import com.app.common.connector.ConnectorAction;
import com.app.common.connector.ConnectorManifest;
import com.app.common.connector.ConnectorScope;
import com.app.persistence.entity.ConnectorManifestEntity;
import com.app.persistence.repository.ConnectorManifestRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.core.env.Environment;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConnectorRegistry {

    private final ObjectMapper objectMapper;
    private final ConnectorManifestRepository repository;
    private final Environment environment;

    @PostConstruct
    public void seedSystemManifests() {
        log.info("Scanning classpath for system connector manifests...");
        try {
            PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources("classpath:connectors/*.json");
            for (Resource resource : resources) {
                try (InputStream is = resource.getInputStream()) {
                    ConnectorManifest manifest = objectMapper.readValue(is, ConnectorManifest.class);
                    
                    ConnectorManifestEntity entity = repository
                            .findByConnectorIdAndScopeAndOrganizationId(manifest.getConnectorId(), ConnectorScope.SYSTEM, null)
                            .orElse(new ConnectorManifestEntity());
                            
                    entity.setScope(ConnectorScope.SYSTEM);
                    entity.setConnectorId(manifest.getConnectorId());
                    entity.setDisplayName(manifest.getDisplayName());
                    entity.setIcon(manifest.getIcon());
                    entity.setCategory(manifest.getCategory());
                    entity.setBaseUrl(manifest.getBaseUrl());
                    entity.setAuthType(manifest.getAuthType());
                    entity.setAuthHeaderName(manifest.getAuthHeaderName());
                    entity.setAuthHeaderPrefix(manifest.getAuthHeaderPrefix());
                    entity.setOauth2Config(manifest.getOauth2Config());
                    entity.setCredentialGuide(manifest.getCredentialGuide());
                    entity.setConnectionSetup(manifest.getConnectionSetup());
                    entity.setVerifyAction(manifest.getVerifyAction());
                    entity.setActions(manifest.getActions());
                    // Don't overwrite enabled status if updating existing entity
                    if (entity.getId() == null) {
                        entity.setEnabled(true);
                    }
                    
                    repository.save(entity);
                    log.info("Upserted system connector: {}", entity.getConnectorId());
                } catch (Exception e) {
                    log.error("Failed to seed connector manifest: {}", resource.getFilename(), e);
                }
            }
        } catch (Exception e) {
            log.error("Failed to scan for connector manifests to seed", e);
        }
    }
    
    private ConnectorManifest mapToDomain(ConnectorManifestEntity entity) {
        ConnectorManifest manifest = new ConnectorManifest();
        manifest.setId(entity.getId());
        manifest.setScope(entity.getScope());
        manifest.setOrganizationId(entity.getOrganizationId());
        manifest.setConnectorId(entity.getConnectorId());
        manifest.setDisplayName(entity.getDisplayName());
        manifest.setIcon(entity.getIcon());
        manifest.setCategory(entity.getCategory());
        manifest.setBaseUrl(entity.getBaseUrl());
        manifest.setAuthType(entity.getAuthType());
        manifest.setAuthHeaderName(entity.getAuthHeaderName());
        manifest.setAuthHeaderPrefix(entity.getAuthHeaderPrefix());
        manifest.setOauth2Config(entity.getOauth2Config());
        manifest.setCredentialGuide(entity.getCredentialGuide());
        manifest.setConnectionSetup(entity.getConnectionSetup());
        manifest.setVerifyAction(entity.getVerifyAction());
        manifest.setActions(entity.getActions());
        manifest.setEnabled(entity.isEnabled());
        
        return manifest;
    }

    public Optional<ConnectorManifest> findById(String connectorId) {
        // Fallback for execution where context isn't passed (system scope)
        return findById(connectorId, null);
    }
    
    public Optional<ConnectorManifest> findById(String connectorId, String organizationId) {
        if (StringUtils.hasText(organizationId)) {
            Optional<ConnectorManifestEntity> tenantEntity = repository.findByConnectorIdAndScopeAndOrganizationId(connectorId, ConnectorScope.TENANT, organizationId);
            if (tenantEntity.isPresent() && tenantEntity.get().isEnabled()) {
                return tenantEntity.map(this::mapToDomain);
            }
        }
        
        Optional<ConnectorManifestEntity> systemEntity = repository.findByConnectorIdAndScopeAndOrganizationId(connectorId, ConnectorScope.SYSTEM, null);
        return systemEntity.filter(ConnectorManifestEntity::isEnabled).map(this::mapToDomain);
    }

    public List<ConnectorManifest> listAll() {
        return repository.findAll().stream()
                .map(this::mapToDomain)
                .collect(Collectors.toList());
    }
    
    public List<ConnectorManifest> listAll(String organizationId) {
        Map<String, ConnectorManifest> merged = new HashMap<>();
        
        // 1. Add all system connectors
        List<ConnectorManifestEntity> systemConnectors = repository.findByScope(ConnectorScope.SYSTEM);
        for (ConnectorManifestEntity entity : systemConnectors) {
            if (entity.isEnabled()) {
                merged.put(entity.getConnectorId(), mapToDomain(entity));
            }
        }
        
        // 2. Add/Override with tenant connectors
        if (StringUtils.hasText(organizationId)) {
            List<ConnectorManifestEntity> tenantConnectors = repository.findByOrganizationId(organizationId);
            for (ConnectorManifestEntity entity : tenantConnectors) {
                if (entity.isEnabled() && entity.getScope() == ConnectorScope.TENANT) {
                    merged.put(entity.getConnectorId(), mapToDomain(entity));
                }
            }
        }
        
        return new ArrayList<>(merged.values());
    }

    public ConnectorAction findAction(String connectorId, String actionId) {
        // For backwards compatibility without orgId, we just use system scope for now
        // A full implementation would pass orgId here as well
        ConnectorManifest manifest = findById(connectorId).orElseThrow(() -> new IllegalArgumentException("Unknown connector: " + connectorId));
        return manifest.getActions().stream()
                .filter(a -> a.getActionId().equals(actionId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Action '" + actionId + "' not found in connector '" + connectorId + "'"));
    }
    
    public ConnectorAction findAction(String connectorId, String actionId, String organizationId) {
        ConnectorManifest manifest = findById(connectorId, organizationId).orElseThrow(() -> new IllegalArgumentException("Unknown connector: " + connectorId));
        return manifest.getActions().stream()
                .filter(a -> a.getActionId().equals(actionId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Action '" + actionId + "' not found in connector '" + connectorId + "'"));
    }
    
    public ConnectorManifest save(ConnectorManifest manifest) {
        ConnectorManifestEntity entity;
        if (StringUtils.hasText(manifest.getId())) {
            entity = repository.findById(manifest.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Manifest not found: " + manifest.getId()));
        } else {
            entity = new ConnectorManifestEntity();
            entity.setScope(manifest.getScope() != null ? manifest.getScope() : ConnectorScope.TENANT);
            entity.setOrganizationId(manifest.getOrganizationId());
        }
        
        entity.setConnectorId(manifest.getConnectorId());
        entity.setDisplayName(manifest.getDisplayName());
        entity.setIcon(manifest.getIcon());
        entity.setCategory(manifest.getCategory());
        entity.setBaseUrl(manifest.getBaseUrl());
        entity.setAuthType(manifest.getAuthType());
        entity.setAuthHeaderName(manifest.getAuthHeaderName());
        entity.setAuthHeaderPrefix(manifest.getAuthHeaderPrefix());
        entity.setOauth2Config(manifest.getOauth2Config());
        entity.setCredentialGuide(manifest.getCredentialGuide());
        entity.setConnectionSetup(manifest.getConnectionSetup());
        entity.setVerifyAction(manifest.getVerifyAction());
        entity.setActions(manifest.getActions());
        entity.setEnabled(manifest.isEnabled());
        
        ConnectorManifestEntity saved = repository.save(entity);
        return mapToDomain(saved);
    }
    
    public void delete(String id) {
        repository.deleteById(id);
    }
}
