package com.app.api.service;

import com.app.api.dto.ConnectorOAuthPlatformConfigDto;
import com.app.common.connector.ConnectorAuthType;
import com.app.common.connector.ConnectorManifest;
import com.app.common.connector.ConnectorScope;
import com.app.common.connector.OAuth2Config;
import com.app.crypto.util.EncryptionService;
import com.app.persistence.connector.ConnectorRegistry;
import com.app.persistence.entity.ConnectorOAuthPlatformConfigEntity;
import com.app.persistence.repository.ConnectorOAuthPlatformConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConnectorOAuthPlatformServiceTest {

    @Mock
    private ConnectorOAuthPlatformConfigRepository repository;
    @Mock
    private ConnectorRegistry connectorRegistry;
    @Mock
    private EncryptionService encryptionService;

    @InjectMocks
    private ConnectorOAuthPlatformService service;

    private ConnectorManifest oauthManifest;

    @BeforeEach
    void setUp() {
        oauthManifest = new ConnectorManifest();
        oauthManifest.setConnectorId("slack");
        oauthManifest.setScope(ConnectorScope.SYSTEM);
        oauthManifest.setAuthType(ConnectorAuthType.OAUTH2);
        oauthManifest.setOauth2Config(new OAuth2Config());
    }

    @Test
    void saveAdminConfig_encryptsClientSecret() {
        when(connectorRegistry.findById("slack", null)).thenReturn(Optional.of(oauthManifest));
        when(repository.findByConnectorId("slack")).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(encryptionService.encrypt("top-secret")).thenReturn("enc-secret");

        ConnectorOAuthPlatformConfigDto request = new ConnectorOAuthPlatformConfigDto();
        request.setClientId("my-client");
        request.setClientSecret("top-secret");
        request.setEnabled(true);

        service.saveAdminConfig("slack", request);

        ArgumentCaptor<ConnectorOAuthPlatformConfigEntity> captor =
                ArgumentCaptor.forClass(ConnectorOAuthPlatformConfigEntity.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getClientId()).isEqualTo("my-client");
        assertThat(captor.getValue().getEncryptedClientSecret()).isEqualTo("enc-secret");
    }
}
