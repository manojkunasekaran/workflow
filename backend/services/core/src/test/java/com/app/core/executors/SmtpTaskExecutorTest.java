package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.SmtpTaskExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.SmtpTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.service.VariableResolver;
import com.app.core.service.CredentialProvider;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedConstruction;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.UUID;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SmtpTaskExecutorTest {

    @Mock
    private VariableResolver variableResolver;
    
    @Mock
    private CredentialProvider credentialProvider;

    @InjectMocks
    private SmtpTaskExecutor executor;

    private WorkflowTask task;
    private WorkflowExecution execution;
    private ExecutionContext context;
    private SmtpTaskParameters params;

    @BeforeEach
    void setUp() {
        params = new SmtpTaskParameters();
        params.setSmtpHost("smtp.example.com");
        params.setSmtpPort(587);
        params.setSmtpUsername("user");
        params.setSmtpPassword("pass");
        params.setSecurity("STARTTLS");
        params.setTo("recipient@example.com");
        params.setFromAddress("sender@example.com");
        params.setSubject("Test Subject");
        params.setBody("Hello World");
        params.setBodyFormat("PLAIN");

        task = new WorkflowTask();
        task.setTaskId(UUID.randomUUID().toString());
        task.setType(TaskType.SMTP_TASK);
        task.setParameters(params);

        execution = new WorkflowExecution();
        context = ExecutionContext.builder().build();
    }

    @Test
    void canExecute_returnsTrueForSmtpTask() {
        assertThat(executor.canExecute(TaskType.SMTP_TASK)).isTrue();
        assertThat(executor.canExecute(TaskType.HTTP_TASK)).isFalse();
    }

    @Test
    void execute_happyPath_sendsEmailAndReturnsCompleted() {
        // Arrange variable resolver to return inputs as-is for simplicity
        when(variableResolver.resolveString(anyString(), eq(context))).thenAnswer(i -> i.getArgument(0));

        try (MockedConstruction<JavaMailSenderImpl> mocked = Mockito.mockConstruction(JavaMailSenderImpl.class,
                (mockSender, context) -> {
                    MimeMessage mockMessage = mock(MimeMessage.class);
                    when(mockSender.createMimeMessage()).thenReturn(mockMessage);
                })) {

            // Act
            TaskExecutionResult result = executor.execute(task, execution, context);

            // Assert
            assertThat(result.getStatus()).isEqualTo(TaskExecutionResult.Status.COMPLETED);
            
            SmtpTaskExecutionData data = (SmtpTaskExecutionData) result.getExecutionData();
            assertThat(data.getStatus()).isEqualTo("SENT");
            assertThat(data.getTo()).isEqualTo("recipient@example.com");
            assertThat(data.getSmtpHost()).isEqualTo("smtp.example.com");
            assertThat(data.getErrorMessage()).isNull();

            // Verify a mail sender was constructed and send() was called
            assertThat(mocked.constructed()).hasSize(1);
            JavaMailSenderImpl mockSender = mocked.constructed().get(0);
            verify(mockSender).setHost("smtp.example.com");
            verify(mockSender).setUsername("user");
            verify(mockSender).setPassword("pass");
            verify(mockSender).send(any(MimeMessage.class));
        }
    }

    @Test
    void execute_missingRequiredField_returnsFailedWithoutSending() {
        // Arrange
        params.setSmtpHost(""); // Invalid
        when(variableResolver.resolveString(anyString(), eq(context))).thenAnswer(i -> i.getArgument(0));
        when(variableResolver.resolveString(eq(""), eq(context))).thenReturn("");

        try (MockedConstruction<JavaMailSenderImpl> mocked = Mockito.mockConstruction(JavaMailSenderImpl.class)) {
            // Act
            TaskExecutionResult result = executor.execute(task, execution, context);

            // Assert
            assertThat(result.getStatus()).isEqualTo(TaskExecutionResult.Status.FAILED);
            assertThat(result.getErrorMessage()).contains("SMTP host is required");

            SmtpTaskExecutionData data = (SmtpTaskExecutionData) result.getExecutionData();
            assertThat(data.getStatus()).isEqualTo("FAILED");
            
            // Should not even try to instantiate JavaMailSender
            assertThat(mocked.constructed()).isEmpty();
        }
    }

    @Test
    void execute_mailSenderThrowsException_returnsFailed() {
        // Arrange
        when(variableResolver.resolveString(anyString(), eq(context))).thenAnswer(i -> i.getArgument(0));

        try (MockedConstruction<JavaMailSenderImpl> mocked = Mockito.mockConstruction(JavaMailSenderImpl.class,
                (mockSender, ctx) -> {
                    MimeMessage mockMessage = mock(MimeMessage.class);
                    when(mockSender.createMimeMessage()).thenReturn(mockMessage);
                    doThrow(new RuntimeException("Connection refused")).when(mockSender).send(any(MimeMessage.class));
                })) {

            // Act
            TaskExecutionResult result = executor.execute(task, execution, context);

            // Assert
            assertThat(result.getStatus()).isEqualTo(TaskExecutionResult.Status.FAILED);
            assertThat(result.getErrorMessage()).contains("Failed to send email");

            SmtpTaskExecutionData data = (SmtpTaskExecutionData) result.getExecutionData();
            assertThat(data.getStatus()).isEqualTo("FAILED");
            assertThat(data.getErrorMessage()).contains("Connection refused");
        }
    }
    
    @Test
    void execute_withHtmlBodyAndNoAuth_worksCorrectly() {
        // Arrange
        params.setSmtpUsername(null);
        params.setSmtpPassword(null);
        params.setBodyFormat("HTML");
        
        when(variableResolver.resolveString(any(), eq(context))).thenAnswer(i -> i.getArgument(0));

        try (MockedConstruction<JavaMailSenderImpl> mocked = Mockito.mockConstruction(JavaMailSenderImpl.class,
                (mockSender, ctx) -> {
                    MimeMessage mockMessage = mock(MimeMessage.class);
                    when(mockSender.createMimeMessage()).thenReturn(mockMessage);
                })) {

            // Act
            TaskExecutionResult result = executor.execute(task, execution, context);

            // Assert
            assertThat(result.getStatus()).isEqualTo(TaskExecutionResult.Status.COMPLETED);
            
            assertThat(mocked.constructed()).hasSize(1);
            JavaMailSenderImpl mockSender = mocked.constructed().get(0);
            
            // Verify no auth was set
            verify(mockSender, never()).setUsername(anyString());
            verify(mockSender, never()).setPassword(anyString());
        }
    }

    @Test
    void execute_withCredentialId_resolvesFromCredentialProvider() {
        // Arrange
        params.setCredentialId("cred-123");
        when(variableResolver.resolveString(eq("cred-123"), eq(context))).thenReturn("cred-123");
        when(variableResolver.resolveString(anyString(), eq(context))).thenAnswer(i -> {
            String arg = i.getArgument(0);
            return "cred-123".equals(arg) ? "cred-123" : arg; // let other fields pass through
        });
        
        Map<String, String> decryptedCreds = Map.of(
            "host", "vault.smtp.com",
            "port", "465",
            "username", "vault-user",
            "password", "vault-pass",
            "security", "SSL"
        );
        when(credentialProvider.resolveCredentials("cred-123", null, null)).thenReturn(java.util.Optional.of(decryptedCreds));

        try (MockedConstruction<JavaMailSenderImpl> mocked = Mockito.mockConstruction(JavaMailSenderImpl.class,
                (mockSender, ctx) -> {
                    MimeMessage mockMessage = mock(MimeMessage.class);
                    when(mockSender.createMimeMessage()).thenReturn(mockMessage);
                })) {

            // Act
            TaskExecutionResult result = executor.execute(task, execution, context);

            // Assert
            assertThat(result.getStatus()).isEqualTo(TaskExecutionResult.Status.COMPLETED);
            
            assertThat(mocked.constructed()).hasSize(1);
            JavaMailSenderImpl mockSender = mocked.constructed().get(0);
            
            // Verify vault credentials were used
            verify(mockSender).setHost("vault.smtp.com");
            verify(mockSender).setPort(465);
            verify(mockSender).setUsername("vault-user");
            verify(mockSender).setPassword("vault-pass");
            verify(mockSender).setProtocol("smtps"); // because SSL
        }
    }
}
