import { Mail } from 'lucide-react';
import { defineTaskPlugin } from '../pluginTypes';
import { formatPrimitive, recordFromUnknown } from '@/features/executions/lib/executionSummaryUtils';

export const smtpTaskPlugin = defineTaskPlugin({
    type: 'SMTP_TASK',
    label: 'Send Email (SMTP)',
    icon: Mail,
    accentColor: '#0891b2',
    defaultTaskId: 'smtp_task',
    fields: [
        // ── SMTP Server ────────────────────────────────────────────────────────
        {
            key: 'credentialId',
            label: 'SMTP Credential',
            type: 'credential',
            filterTypes: ['SMTP'],
            description: 'Select a saved SMTP credential to securely connect to the server.',
        },
        {
            key: 'smtpHost',
            label: 'SMTP Host',
            type: 'text',
            required: true,
            placeholder: 'smtp.gmail.com',
            description: 'Hostname of your SMTP server.',
            hideIf: (p) => !!p.credentialId,
        },
        {
            key: 'smtpPort',
            label: 'SMTP Port',
            type: 'number',
            required: true,
            defaultValue: 587,
            placeholder: '587',
            description: 'Common ports: 25 (plain), 465 (SSL), 587 (STARTTLS).',
            hideIf: (p) => !!p.credentialId,
        },
        {
            key: 'security',
            label: 'Security',
            type: 'segmented',
            defaultValue: 'STARTTLS',
            options: [
                { label: 'None', value: 'NONE' },
                { label: 'STARTTLS', value: 'STARTTLS' },
                { label: 'SSL/TLS', value: 'SSL' },
            ],
            hideIf: (p) => !!p.credentialId,
        },
        {
            key: 'smtpUsername',
            label: 'Username',
            type: 'text',
            placeholder: 'you@gmail.com',
            description: 'SMTP login username (usually your email address). Leave blank if authentication is disabled.',
            hideIf: (p) => !!p.credentialId,
        },
        {
            key: 'smtpPassword',
            label: 'Password',
            type: 'text',
            mono: true,
            placeholder: '{{$variables.smtpPassword}}',
            description: 'SMTP password or app-specific password. Use a workflow variable to keep it out of the definition.',
            hideIf: (p) => !!p.credentialId,
        },
        // ── From ──────────────────────────────────────────────────────────────
        {
            key: 'fromAddress',
            label: 'From Address',
            type: 'text',
            required: true,
            placeholder: 'alerts@mycompany.com',
        },
        {
            key: 'fromName',
            label: 'From Name',
            type: 'text',
            placeholder: 'My App Alerts',
            description: 'Optional display name shown alongside the from address.',
        },
        // ── Recipients ────────────────────────────────────────────────────────
        {
            key: 'to',
            label: 'To',
            type: 'text',
            required: true,
            placeholder: 'recipient@example.com',
            description: 'Recipient address(es). Separate multiple with commas. Supports {{ expressions }}.',
        },
        {
            key: 'cc',
            label: 'CC',
            type: 'text',
            placeholder: 'cc@example.com',
            description: 'Optional. Separate multiple with commas.',
        },
        {
            key: 'bcc',
            label: 'BCC',
            type: 'text',
            placeholder: 'bcc@example.com',
            description: 'Optional. Separate multiple with commas.',
        },
        // ── Message ───────────────────────────────────────────────────────────
        {
            key: 'subject',
            label: 'Subject',
            type: 'text',
            required: true,
            placeholder: 'Alert: {{$tasks.check_task.status}}',
            description: 'Email subject line. Supports {{ expressions }}.',
        },
        {
            key: 'bodyFormat',
            label: 'Body Format',
            type: 'segmented',
            defaultValue: 'PLAIN',
            options: [
                { label: 'Plain Text', value: 'PLAIN' },
                { label: 'HTML', value: 'HTML' },
            ],
        },
        {
            key: 'body',
            label: 'Body',
            type: 'textarea',
            rows: 8,
            placeholder: 'Hello,\n\nYour workflow completed.\n\nResult: {{$tasks.previous_task.output}}',
            description: 'Email body. Supports {{ expressions }}.',
        },
    ],

    validate(parameters, _context, errors) {
        if (!parameters.credentialId) {
            if (!parameters.smtpHost || String(parameters.smtpHost).trim() === '') {
                errors.smtpHost = 'SMTP host is required';
            }
        }
        if (!parameters.to || String(parameters.to).trim() === '') {
            errors.to = 'At least one recipient is required';
        }
        if (!parameters.subject || String(parameters.subject).trim() === '') {
            errors.subject = 'Subject is required';
        }
        if (!parameters.fromAddress || String(parameters.fromAddress).trim() === '') {
            errors.fromAddress = 'From address is required';
        }
    },

    preview(params) {
        const host = String(params.smtpHost ?? '');
        const to = String(params.to ?? '');
        const subject = String(params.subject ?? '');

        const primaryLabel = host ? host : 'Configure SMTP';
        const secondaryLabel = to
            ? subject
                ? (subject.length > 30 ? `${subject.slice(0, 30)}…` : subject)
                : to
            : undefined;

        return {
            primary: primaryLabel,
            secondary: secondaryLabel,
        };
    },

    executionSummary({ parameters, executionData, errorMessage }) {
        const data = recordFromUnknown(executionData);
        const status = formatPrimitive(data?.status);
        const isSent = status === 'SENT';

        return {
            lines: [
                {
                    label: 'Status',
                    value: status || (errorMessage ? 'FAILED' : '—'),
                    tone: isSent ? 'success' : errorMessage || status === 'FAILED' ? 'danger' : 'default',
                },
                {
                    label: 'To',
                    value: formatPrimitive(data?.to ?? parameters.to),
                },
                {
                    label: 'Subject',
                    value: formatPrimitive(data?.subject ?? parameters.subject),
                },
                {
                    label: 'SMTP',
                    value: data?.smtpHost
                        ? `${data.smtpHost}:${data.smtpPort}`
                        : formatPrimitive(parameters.smtpHost),
                },
                {
                    label: 'Sent At',
                    value: formatPrimitive(data?.sentAt),
                },
                {
                    label: 'Error',
                    value: formatPrimitive(data?.errorMessage ?? errorMessage),
                    tone: data?.errorMessage || errorMessage ? 'danger' : 'default',
                },
            ],
        };
    },
});
