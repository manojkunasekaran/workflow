package com.app.common.connector;

import lombok.Data;
import java.util.List;

@Data
public class ConnectorManifest {
    private String id;
    private ConnectorScope scope;
    private String organizationId;
    private String connectorId;
    private String displayName;
    private String icon;
    private String category;
    private String baseUrl;
    private ConnectorAuthType authType;
    private String authHeaderName;
    private String authHeaderPrefix;
    private CredentialGuide credentialGuide;
    private OAuth2Config oauth2Config;
    private List<ConnectorAction> actions;
    private boolean enabled = true;
}
