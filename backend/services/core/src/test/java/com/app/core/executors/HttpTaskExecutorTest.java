package com.app.core.executors;

import com.app.common.entity.IntegrationCredential;
import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.HttpTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.service.CredentialProvider;
import com.app.core.service.VariableResolver;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

// Should read the rules before creating/updating the test files
@ExtendWith(MockitoExtension.class)
public class HttpTaskExecutorTest {

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private CredentialProvider credentialProvider;

    @Mock
    private VariableResolver variableResolver;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private HttpTaskExecutor executor;

    private WorkflowTask task;
    private HttpTaskParameters params;
    private ExecutionContext context;
    private WorkflowExecution execution;

    @BeforeEach
    void setUp() {
        params = new HttpTaskParameters();
        params.setUrl("https://api.example.com");
        params.setMethod("GET");

        task = new WorkflowTask();
        task.setTaskId("task1");
        task.setParameters(params);

        context = ExecutionContext.builder().build();
        execution = new WorkflowExecution();

        when(variableResolver.resolveString(anyString(), any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void execute_withBearerToken_shouldInjectAuthorizationHeader() {
        params.setCredentialId("cred-bearer");

        IntegrationCredential cred = new IntegrationCredential();
        cred.setType("BEARER_TOKEN");
        Map<String, String> secrets = new HashMap<>();
        secrets.put("token", "secret-token");
        cred.setCredentials(secrets);

        when(credentialProvider.getDecryptedCredential("cred-bearer")).thenReturn(Optional.of(cred));
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        TaskExecutionResult result = executor.execute(task, execution, context);

        assertEquals(TaskExecutionResult.Status.COMPLETED, result.getStatus());

        ArgumentCaptor<HttpEntity> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(eq("https://api.example.com"), eq(HttpMethod.GET), entityCaptor.capture(), eq(String.class));

        HttpEntity entity = entityCaptor.getValue();
        HttpHeaders headers = entity.getHeaders();
        assertTrue(headers.containsKey(HttpHeaders.AUTHORIZATION));
        assertEquals("Bearer secret-token", headers.getFirst(HttpHeaders.AUTHORIZATION));
    }

    @Test
    void execute_withBasicAuth_shouldInjectAuthorizationHeader() {
        params.setCredentialId("cred-basic");

        IntegrationCredential cred = new IntegrationCredential();
        cred.setType("BASIC_AUTH");
        Map<String, String> secrets = new HashMap<>();
        secrets.put("username", "admin");
        secrets.put("password", "pass");
        cred.setCredentials(secrets);

        when(credentialProvider.getDecryptedCredential("cred-basic")).thenReturn(Optional.of(cred));
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        executor.execute(task, execution, context);

        ArgumentCaptor<HttpEntity> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(anyString(), any(HttpMethod.class), entityCaptor.capture(), eq(String.class));

        HttpEntity entity = entityCaptor.getValue();
        HttpHeaders headers = entity.getHeaders();
        assertTrue(headers.containsKey(HttpHeaders.AUTHORIZATION));
        // Base64 of "admin:pass" is "YWRtaW46cGFzcw=="
        assertEquals("Basic YWRtaW46cGFzcw==", headers.getFirst(HttpHeaders.AUTHORIZATION));
    }
}
