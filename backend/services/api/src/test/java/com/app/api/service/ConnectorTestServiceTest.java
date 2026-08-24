package com.app.api.service;

import com.app.api.dto.ConnectorTestRequest;
import com.app.api.dto.ConnectorTestResult;
import com.app.common.connector.ConnectorAction;
import com.app.common.connector.ConnectorAuthType;
import com.app.common.connector.ConnectorManifest;
import com.app.common.entity.IntegrationCredential;
import com.app.core.service.CredentialProvider;
import com.app.core.service.ScriptEvaluationService;
import com.app.persistence.connector.ConnectorRegistry;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConnectorTestServiceTest {

    @Mock
    private ConnectorRegistry connectorRegistry;
    @Mock
    private CredentialProvider credentialProvider;
    @Mock
    private RestTemplate restTemplate;
    @Mock
    private ObjectMapper objectMapper;
    @Mock
    private ScriptEvaluationService scriptEvaluationService;

    @InjectMocks
    private ConnectorTestService testService;

    private ConnectorTestRequest request;
    private ConnectorManifest manifest;
    private ConnectorAction action;
    private IntegrationCredential credential;

    @BeforeEach
    void setUp() {
        request = new ConnectorTestRequest();
        request.setActionId("get_user");
        request.setCredentialId("cred-1");
        
        Map<String, Object> inputs = new HashMap<>();
        inputs.put("userId", "123");
        request.setInputs(inputs);

        action = new ConnectorAction();
        action.setActionId("get_user");
        action.setMethod("GET");
        action.setPath("/users/{userId}");
        action.setPathParams(List.of("userId"));

        manifest = new ConnectorManifest();
        manifest.setConnectorId("dummy");
        manifest.setBaseUrl("https://api.dummy.com");
        manifest.setAuthType(ConnectorAuthType.BEARER_TOKEN);
        manifest.setActions(List.of(action));

        credential = new IntegrationCredential();
        credential.setId("cred-1");
        credential.setCredentials(Map.of("token", "secret-token"));
    }

    @Test
    void testAction_shouldReturnSuccessfulResult() throws Exception {
        when(connectorRegistry.findById("dummy", "default-org")).thenReturn(Optional.of(manifest));
        when(credentialProvider.getDecryptedCredential("cred-1")).thenReturn(Optional.of(credential));

        ResponseEntity<String> responseEntity = new ResponseEntity<>("{\"id\":\"123\", \"name\":\"John\"}", HttpStatus.OK);
        when(restTemplate.exchange(
                eq("https://api.dummy.com/users/123"), // Path param substituted!
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(String.class)
        )).thenReturn(responseEntity);

        when(objectMapper.readValue("{\"id\":\"123\", \"name\":\"John\"}", Object.class))
                .thenReturn(Map.of("id", "123", "name", "John"));

        ConnectorTestResult result = testService.testAction("dummy", request);

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getStatusCode()).isEqualTo(200);
        assertThat(result.getResponse()).isEqualTo(Map.of("id", "123", "name", "John"));
        assertThat(result.getDurationMs()).isGreaterThanOrEqualTo(0);
        assertThat(result.getError()).isNull();
    }

    @Test
    void testAction_shouldReturnErrorResultOnHttpClientException() throws Exception {
        when(connectorRegistry.findById("dummy", "default-org")).thenReturn(Optional.of(manifest));
        when(credentialProvider.getDecryptedCredential("cred-1")).thenReturn(Optional.of(credential));

        HttpClientErrorException exception404 = HttpClientErrorException.create(
                HttpStatus.NOT_FOUND, "Not Found", HttpHeaders.EMPTY, "{\"error\":\"User not found\"}".getBytes(StandardCharsets.UTF_8), null);

        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
                .thenThrow(exception404);

        when(objectMapper.readValue("{\"error\":\"User not found\"}", Object.class))
                .thenReturn(Map.of("error", "User not found"));

        ConnectorTestResult result = testService.testAction("dummy", request);

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getStatusCode()).isEqualTo(404);
        assertThat(result.getResponse()).isEqualTo(Map.of("error", "User not found"));
        assertThat(result.getError()).contains("HTTP 404");
    }
}
