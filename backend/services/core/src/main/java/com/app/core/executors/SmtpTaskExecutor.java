package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.SmtpTaskExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.SmtpTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.service.TaskExecutor;
import com.app.core.service.VariableResolver;
import com.app.core.service.CredentialProvider;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Arrays;
import java.util.Properties;
import java.util.Map;

/**
 * Executes an SMTP_TASK node.
 *
 * Each execution instantiates its own {@link JavaMailSenderImpl} using the
 * SMTP credentials configured directly on the node — no shared server-level
 * mail configuration is required.  Users supply their own SMTP host, port,
 * username, and password (which may reference workflow variables).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SmtpTaskExecutor implements TaskExecutor {

    private final VariableResolver variableResolver;
    private final CredentialProvider credentialProvider;

    @Override
    public boolean canExecute(TaskType taskType) {
        return TaskType.SMTP_TASK == taskType;
    }

    @Override
    public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
        log.info("Starting execution of SMTP Task: {}", task.getTaskId());

        if (!(task.getParameters() instanceof SmtpTaskParameters params)) {
            throw new IllegalArgumentException("Invalid parameters for SMTP task");
        }

        String credentialId = variableResolver.resolveString(params.getCredentialId(), context);
        
        String smtpHost, smtpUsername, smtpPassword, security;
        int smtpPort;

        if (credentialId != null && !credentialId.isBlank()) {
            Map<String, String> creds = credentialProvider.getDecryptedCredentials(credentialId)
                    .orElseThrow(() -> new IllegalArgumentException("Credential not found: " + credentialId));
            
            smtpHost = creds.get("host");
            smtpUsername = creds.get("username");
            smtpPassword = creds.get("password");
            security = creds.getOrDefault("security", "STARTTLS").toUpperCase();
            smtpPort = creds.containsKey("port") ? Integer.parseInt(creds.get("port")) : 587;
        } else {
            smtpHost     = variableResolver.resolveString(params.getSmtpHost(), context);
            smtpUsername = variableResolver.resolveString(params.getSmtpUsername(), context);
            smtpPassword = variableResolver.resolveString(params.getSmtpPassword(), context);
            security     = params.getSecurity() != null ? params.getSecurity().toUpperCase() : "STARTTLS";
            smtpPort     = params.getSmtpPort() != null ? params.getSmtpPort() : 587;
        }

        // Always resolve these regardless of credential setup
        String fromAddress  = variableResolver.resolveString(params.getFromAddress(), context);
        String fromName     = variableResolver.resolveString(params.getFromName(), context);
        String to           = variableResolver.resolveString(params.getTo(), context);
        String cc           = variableResolver.resolveString(params.getCc(), context);
        String bcc          = variableResolver.resolveString(params.getBcc(), context);
        String subject      = variableResolver.resolveString(params.getSubject(), context);
        String body         = variableResolver.resolveString(params.getBody(), context);
        boolean isHtml      = "HTML".equalsIgnoreCase(params.getBodyFormat());

        // ── Validate required fields ───────────────────────────────────────────
        if (smtpHost == null || smtpHost.isBlank()) {
            return failResult("SMTP host is required", to, cc, subject, smtpHost, smtpPort, fromAddress, null);
        }
        if (to == null || to.isBlank()) {
            return failResult("Recipient (To) is required", to, cc, subject, smtpHost, smtpPort, fromAddress, null);
        }
        if (subject == null || subject.isBlank()) {
            return failResult("Subject is required", to, cc, subject, smtpHost, smtpPort, fromAddress, null);
        }
        if (fromAddress == null || fromAddress.isBlank()) {
            return failResult("From address is required", to, cc, subject, smtpHost, smtpPort, fromAddress, null);
        }

        // ── Build a per-execution JavaMailSender ──────────────────────────────
        JavaMailSenderImpl mailSender = buildMailSender(smtpHost, smtpPort, smtpUsername, smtpPassword, security);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");

            // From
            if (fromName != null && !fromName.isBlank()) {
                helper.setFrom(new InternetAddress(fromAddress, fromName));
            } else {
                helper.setFrom(fromAddress);
            }

            // Recipients
            helper.setTo(splitAddresses(to));
            if (cc != null && !cc.isBlank()) helper.setCc(splitAddresses(cc));
            if (bcc != null && !bcc.isBlank()) helper.setBcc(splitAddresses(bcc));

            helper.setSubject(subject);
            helper.setText(body != null ? body : "", isHtml);

            mailSender.send(message);
            log.info("SMTP Task [{}] — email sent to '{}' via {}:{}", task.getTaskId(), to, smtpHost, smtpPort);

            SmtpTaskExecutionData data = SmtpTaskExecutionData.builder()
                    .to(to).cc(cc).subject(subject)
                    .smtpHost(smtpHost).smtpPort(smtpPort)
                    .fromAddress(fromAddress)
                    .status("SENT")
                    .sentAt(Instant.now())
                    .build();

            return TaskExecutionResult.builder()
                    .status(TaskExecutionResult.Status.COMPLETED)
                    .executionData(data)
                    .output(buildOutput(data))
                    .build();

        } catch (Exception e) {
            log.error("SMTP Task [{}] — failed to send email: {}", task.getTaskId(), e.getMessage(), e);
            return failResult("Failed to send email: " + e.getMessage(),
                    to, cc, subject, smtpHost, smtpPort, fromAddress, e.getMessage());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Builds a fresh {@link JavaMailSenderImpl} configured from the node's own
     * SMTP credentials.  A new instance is created per execution so that
     * different workflow nodes (or different executions of the same node) can
     * use entirely different mail servers without any shared state.
     */
    private JavaMailSenderImpl buildMailSender(String host, int port,
                                               String username, String password,
                                               String security) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host);
        sender.setPort(port);

        boolean hasAuth = username != null && !username.isBlank();
        if (hasAuth) {
            sender.setUsername(username);
            sender.setPassword(password);
        }

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", String.valueOf(hasAuth));
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");
        props.put("mail.smtp.writetimeout", "10000");

        switch (security) {
            case "SSL" -> {
                sender.setProtocol("smtps");
                props.put("mail.smtp.ssl.enable", "true");
            }
            case "STARTTLS" -> {
                props.put("mail.smtp.starttls.enable", "true");
                props.put("mail.smtp.starttls.required", "true");
            }
            default -> {
                // NONE — plain SMTP, no TLS
            }
        }

        return sender;
    }

    /** Split a comma/semicolon-separated address string into an array. */
    private String[] splitAddresses(String addresses) {
        return Arrays.stream(addresses.split("[,;]"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);
    }

    private TaskExecutionResult failResult(String errorMessage, String to, String cc,
                                           String subject, String smtpHost, int smtpPort,
                                           String fromAddress, String causeMessage) {
        SmtpTaskExecutionData data = SmtpTaskExecutionData.builder()
                .to(to).cc(cc).subject(subject)
                .smtpHost(smtpHost).smtpPort(smtpPort)
                .fromAddress(fromAddress)
                .status("FAILED")
                .errorMessage(causeMessage != null ? causeMessage : errorMessage)
                .sentAt(Instant.now())
                .build();
        return TaskExecutionResult.builder()
                .status(TaskExecutionResult.Status.FAILED)
                .errorMessage(errorMessage)
                .executionData(data)
                .output(buildOutput(data))
                .build();
    }
}
