package com.app.persistence.entity;

import com.app.common.connector.ConnectorAction;
import com.app.common.connector.ConnectorTrigger;
import com.app.common.connector.ConnectorAuthType;
import com.app.common.connector.ConnectorScope;
import com.app.common.connector.CredentialGuide;
import com.app.common.connector.OAuth2Config;
import com.app.common.connector.ConnectionSetup;
import com.app.common.connector.VerifyAction;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Data
@Document(collection = "connector_manifests")
@CompoundIndexes({
        @CompoundIndex(name = "connectorId_scope_orgId", def = "{'connectorId': 1, 'scope': 1, 'organizationId': 1}", unique = true)
})
public class ConnectorManifestEntity {
    @Id
    private String id;
    
    private ConnectorScope scope;
    private String organizationId;
    
    private String connectorId;
    private String displayName;
    private String icon;
    private String category;
    private String taskType;
    private String baseUrl;
    
    private ConnectorAuthType authType;
    private String authHeaderName;
    private String authHeaderPrefix;
    private OAuth2Config oauth2Config;
    private CredentialGuide credentialGuide;
    private ConnectionSetup connectionSetup;
    private VerifyAction verifyAction;
    
    private List<ConnectorAction> actions;
    private List<ConnectorTrigger> triggers;

    private boolean enabled = true;
    
    private String createdBy;
    @CreatedDate
    private Instant createdAt;
    @LastModifiedDate
    private Instant updatedAt;
}
