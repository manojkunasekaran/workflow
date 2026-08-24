package com.app.core.executors;

import com.app.common.connector.ConnectorAction;
import com.app.common.connector.ConnectorAuthType;
import com.app.common.connector.ConnectorManifest;
import com.app.common.entity.IntegrationCredential;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.ConnectorTaskExecutionData;
import com.app.common.model.task.execution.TaskExecutionData;
import com.app.common.constant.TaskExecutionStatus;
import com.app.common.model.task.parameters.ConnectorTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.service.CredentialProvider;
import com.app.core.service.ScriptEvaluationService;
import com.app.core.service.VariableResolver;
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
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConnectorTaskExecutorTest {

    @Mock
    private ConnectorRegistry connectorRegistry;
    @Mock
    private CredentialProvider credentialProvider;
    @Mock
    private VariableResolver variableResolver;
    @Mock
    private RestTemplate restTemplate;
    @Mock
    private ObjectMapper objectMapper;
    @Mock
    private ScriptEvaluationService scriptEvaluationService;

    @InjectMocks
    private ConnectorTaskExecutor executor;

    private ExecutionContext context;
    private WorkflowTask task;
    private ConnectorTaskParameters params;
    private ConnectorManifest manifest;
    private ConnectorAction action;
    private IntegrationCredential credential;

    @BeforeEach
    void setUp() {
        context = ExecutionContext.builder()
                .workflowExecutionId("exec-1")
                .workflowVariables(new HashMap<>())
                .taskOutputs(new HashMap<>())
                .build();

        params = new ConnectorTaskParameters();
        params.setConnectorId("slack");
        params.setActionId("post_message");
        params.setCredentialId("cred-1");
        params.setInputs(Map.of("channel", "C123", "text", "Hello"));
        // Use a fast retry delay for tests!
        params.setRetryDelayMs(10L);

        task = new WorkflowTask();
        task.setTaskId("task-1");
        task.setType(TaskType.CONNECTOR_TASK);
        task.setParameters(params);

        action = new ConnectorAction();
        action.setActionId("post_message");
        action.setMethod("POST");
        action.setPath("/chat.postMessage");
        
        manifest = new ConnectorManifest();
        manifest.setConnectorId("slack");
        manifest.setBaseUrl("https://slack.com/api");
        manifest.setAuthType(ConnectorAuthType.BEARER_TOKEN);
        manifest.setActions(List.of(action));

        credential = new IntegrationCredential();
        credential.setId("cred-1");
        credential.setCredentials(Map.of("token", "xoxb-123"));
    }

    @Test
    void canExecute_shouldReturnTrueForConnectorTask() {
        assertThat(executor.canExecute(TaskType.CONNECTOR_TASK)).isTrue();
        assertThat(executor.canExecute(TaskType.HTTP_TASK)).isFalse();
    }

    @Test
    void execute_shouldPerformBasicSuccessRequest() throws Exception {
        when(connectorRegistry.findById("slack", "default-org")).thenReturn(Optional.of(manifest));
        when(credentialProvider.getDecryptedCredential("cred-1")).thenReturn(Optional.of(credential));
        when(variableResolver.resolveObject(any(), anyMap())).thenReturn(params.getInputs());
        
        ResponseEntity<String> successResponse = new ResponseEntity<>("{\"ok\":true}", HttpStatus.OK);
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenReturn(successResponse);
                
        when(objectMapper.readValue("{\"ok\":true}", Object.class)).thenReturn(Map.of("ok", true));

        TaskExecutionData result = executor.execute(task, context);

        assertThat(result.getStatus()).isEqualTo(TaskExecutionStatus.COMPLETED);
        assertThat(result).isInstanceOf(ConnectorTaskExecutionData.class);
        ConnectorTaskExecutionData connResult = (ConnectorTaskExecutionData) result;
        assertThat(connResult.getResponse()).isEqualTo(Map.of("ok", true));
        assertThat(connResult.getStatusCode()).isEqualTo(200);

        verify(restTemplate, times(1)).exchange(
                eq("https://slack.com/api/chat.postMessage"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(String.class)
        );
    }

    @Test
    void execute_shouldRetryOn5xxErrors() throws Exception {
        when(connectorRegistry.findById("slack", "default-org")).thenReturn(Optional.of(manifest));
        when(credentialProvider.getDecryptedCredential("cred-1")).thenReturn(Optional.of(credential));
        when(variableResolver.resolveObject(any(), anyMap())).thenReturn(params.getInputs());
        
        // 1st attempt: 503
        HttpServerErrorException exception503 = HttpServerErrorException.create(
                HttpStatus.SERVICE_UNAVAILABLE, "Unavailable", HttpHeaders.EMPTY, null, null);
        // 2nd attempt: 200 OK
        ResponseEntity<String> successResponse = new ResponseEntity<>("{\"ok\":true}", HttpStatus.OK);
        
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenThrow(exception503)
                .thenReturn(successResponse);
                
        when(objectMapper.readValue("{\"ok\":true}", Object.class)).thenReturn(Map.of("ok", true));

        TaskExecutionData result = executor.execute(task, context);

        assertThat(result.getStatus()).isEqualTo(TaskExecutionStatus.COMPLETED);
        verify(restTemplate, times(2)).exchange(anyString(), any(), any(), eq(String.class));
    }

    @Test
    void execute_shouldParseRetryAfterHeaderOn429() throws Exception {
        when(connectorRegistry.findById("slack", "default-org")).thenReturn(Optional.of(manifest));
        when(credentialProvider.getDecryptedCredential("cred-1")).thenReturn(Optional.of(credential));
        when(variableResolver.resolveObject(any(), anyMap())).thenReturn(params.getInputs());
        
        HttpHeaders headers = new HttpHeaders();
        // Since test delay is small, let's just make Retry-After 1 second. 
        // In reality, we don't want to block the test for long.
        // The executor parses Retry-After in seconds. Let's use 0 to speed up the test.
        headers.add(HttpHeaders.RETRY_AFTER, "0");
        
        HttpClientErrorException exception429 = HttpClientErrorException.create(
                HttpStatus.TOO_MANY_REQUESTS, "Too Many Requests", headers, null, null);
                
        ResponseEntity<String> successResponse = new ResponseEntity<>("{\"ok\":true}", HttpStatus.OK);
        
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenThrow(exception429)
                .thenReturn(successResponse);
                
        when(objectMapper.readValue("{\"ok\":true}", Object.class)).thenReturn(Map.of("ok", true));

        TaskExecutionData result = executor.execute(task, context);

        assertThat(result.getStatus()).isEqualTo(TaskExecutionStatus.COMPLETED);
        verify(restTemplate, times(2)).exchange(anyString(), any(), any(), eq(String.class));
    }

    @Test
    void execute_shouldFailFastOnNonRetryable4xx() throws Exception {
        when(connectorRegistry.findById("slack", "default-org")).thenReturn(Optional.of(manifest));
        when(credentialProvider.getDecryptedCredential("cred-1")).thenReturn(Optional.of(credential));
        when(variableResolver.resolveObject(any(), anyMap())).thenReturn(params.getInputs());
        
        // 400 Bad Request should NOT be retried
        HttpClientErrorException exception400 = HttpClientErrorException.create(
                HttpStatus.BAD_REQUEST, "Bad Request", HttpHeaders.EMPTY, "invalid_channel".getBytes(StandardCharsets.UTF_8), null);
        
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenThrow(exception400);

        TaskExecutionData result = executor.execute(task, context);

        assertThat(result.getStatus()).isEqualTo(TaskExecutionStatus.FAILED);
        assertThat(result.getError()).contains("invalid_channel");
        
        // RestTemplate should only be called once!
        verify(restTemplate, times(1)).exchange(anyString(), any(), any(), eq(String.class));
    }

    @Test
    void execute_shouldThrowIfOAuthTokenIsExpired() {
        credential.setTokenType("oauth2");
        credential.setTokenExpiresAt(Instant.now().minusSeconds(3600)); // expired 1 hour ago
        
        when(connectorRegistry.findById("slack", "default-org")).thenReturn(Optional.of(manifest));
        when(credentialProvider.getDecryptedCredential("cred-1")).thenReturn(Optional.of(credential));
        when(variableResolver.resolveObject(any(), anyMap())).thenReturn(params.getInputs());

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> {
            executor.execute(task, context);
        });
        
        assertThat(exception.getMessage()).contains("OAuth2 token for credential").contains("has expired");
        verify(restTemplate, times(0)).exchange(anyString(), any(), any(), eq(String.class));
    }

    @Test
    void execute_shouldExecuteInputScriptIfPresent() throws Exception {
        action.setInputScript("return { mapped: inputs.channel };");
        
        when(connectorRegistry.findById("slack", "default-org")).thenReturn(Optional.of(manifest));
        when(credentialProvider.getDecryptedCredential("cred-1")).thenReturn(Optional.of(credential));
        when(variableResolver.resolveObject(any(), anyMap())).thenReturn(params.getInputs());
        
        when(scriptEvaluationService.executeScript(anyString(), anyMap()))
                .thenReturn(new ScriptEvaluationService.ScriptResult(Map.of("mapped", "C123"), Collections.emptyList()));
                
        ResponseEntity<String> successResponse = new ResponseEntity<>("{\"ok\":true}", HttpStatus.OK);
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenReturn(successResponse);
                
        when(objectMapper.readValue("{\"ok\":true}", Object.class)).thenReturn(Map.of("ok", true));

        executor.execute(task, context);

        verify(scriptEvaluationService, times(1)).executeScript(eq("return { mapped: inputs.channel };"), anyMap());
    }
}
