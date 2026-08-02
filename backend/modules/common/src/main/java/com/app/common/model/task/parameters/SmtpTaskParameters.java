package com.app.common.model.task.parameters;

import lombok.Data;

/**
 * Parameters for an SMTP_TASK node.
 *
 * Each node carries its own SMTP server connection settings so that users
 * are fully in control of which mail server is used — no shared server
 * configuration is required. All fields support {{ expression }} syntax
 * for variable substitution at runtime.
 */
@Data
public class SmtpTaskParameters implements TaskParameters {

    // ── SMTP Server Connection ────────────────────────────────────────────────

    /** 
     * Optional ID of an IntegrationCredential. If provided, the executor will 
     * fetch the host, port, username, and password from the secure vault instead 
     * of using the manual fields below.
     */
    private String credentialId;

    /** SMTP server hostname, e.g. smtp.gmail.com */
    private String smtpHost;

    /** SMTP server port. Typical values: 25, 465 (SSL), 587 (STARTTLS). */
    private Integer smtpPort = 587;

    /** SMTP authentication username (usually the sender's email address). */
    private String smtpUsername;

    /**
     * SMTP authentication password or app-specific password.
     * Best practice: use a workflow variable — {{$variables.smtpPassword}}.
     */
    private String smtpPassword;

    /**
     * Connection security mode.
     * Accepted values: "NONE", "STARTTLS", "SSL"
     * Default: "STARTTLS"
     */
    private String security = "STARTTLS";

    // ── Sender ───────────────────────────────────────────────────────────────

    /** From email address, e.g. alerts@mycompany.com */
    private String fromAddress;

    /** Optional display name for the from address, e.g. "My App Alerts" */
    private String fromName;

    // ── Recipients ───────────────────────────────────────────────────────────

    /** Recipient(s). Comma-separated for multiple, supports {{ expressions }}. */
    private String to;

    /** Optional CC recipient(s). Comma-separated. */
    private String cc;

    /** Optional BCC recipient(s). Comma-separated. */
    private String bcc;

    // ── Message ──────────────────────────────────────────────────────────────

    /** Email subject line. Supports {{ expressions }}. */
    private String subject;

    /** Email body. Supports {{ expressions }}. Plain text or HTML. */
    private String body;

    /**
     * Body content type. "PLAIN" renders as plain text; "HTML" renders as rich HTML.
     * Default: "PLAIN"
     */
    private String bodyFormat = "PLAIN";
}
