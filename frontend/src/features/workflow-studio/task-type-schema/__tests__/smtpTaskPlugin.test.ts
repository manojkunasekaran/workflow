// Should read the rules before creating/updating the test files
import { describe, it, expect } from 'vitest';
import { smtpTaskPlugin } from '../plugins/smtpTaskPlugin';

describe('smtpTaskPlugin', () => {
    // ── Happy path ──────────────────────────────────────────────────────────

    describe('validate', () => {
        it('passes with all required fields present', () => {
            const errors: Record<string, string> = {};
            smtpTaskPlugin.validate!(
                {
                    smtpHost: 'smtp.gmail.com',
                    smtpPort: 587,
                    fromAddress: 'sender@example.com',
                    to: 'recipient@example.com',
                    subject: 'Hello',
                    body: 'World',
                },
                undefined,
                errors,
            );
            expect(errors).toEqual({});
        });
    });

    // ── Negative / error paths ──────────────────────────────────────────────

    describe('validate — missing required fields', () => {
        it('flags missing smtpHost', () => {
            const errors: Record<string, string> = {};
            smtpTaskPlugin.validate!({ to: 'a@b.com', subject: 'hi', fromAddress: 'f@b.com' }, undefined, errors);
            expect(errors.smtpHost).toBeTruthy();
        });

        it('flags missing to', () => {
            const errors: Record<string, string> = {};
            smtpTaskPlugin.validate!({ smtpHost: 'smtp.x.com', subject: 'hi', fromAddress: 'f@b.com' }, undefined, errors);
            expect(errors.to).toBeTruthy();
        });

        it('flags missing subject', () => {
            const errors: Record<string, string> = {};
            smtpTaskPlugin.validate!({ smtpHost: 'smtp.x.com', to: 'a@b.com', fromAddress: 'f@b.com' }, undefined, errors);
            expect(errors.subject).toBeTruthy();
        });

        it('flags missing fromAddress', () => {
            const errors: Record<string, string> = {};
            smtpTaskPlugin.validate!({ smtpHost: 'smtp.x.com', to: 'a@b.com', subject: 'hi' }, undefined, errors);
            expect(errors.fromAddress).toBeTruthy();
        });

        it('flags blank smtpHost (whitespace only)', () => {
            const errors: Record<string, string> = {};
            smtpTaskPlugin.validate!({ smtpHost: '   ', to: 'a@b.com', subject: 'hi', fromAddress: 'f@b.com' }, undefined, errors);
            expect(errors.smtpHost).toBeTruthy();
        });
    });

    // ── Edge cases ──────────────────────────────────────────────────────────

    describe('preview', () => {
        it('shows smtp host and subject as primary/secondary when configured', () => {
            const result = smtpTaskPlugin.preview!({
                smtpHost: 'smtp.gmail.com',
                to: 'a@b.com',
                subject: 'My Alert',
            });
            expect(result.primary).toBe('smtp.gmail.com');
            expect(result.secondary).toBe('My Alert');
        });

        it('shows "Configure SMTP" as primary when host is empty', () => {
            const result = smtpTaskPlugin.preview!({});
            expect(result.primary).toBe('Configure SMTP');
            expect(result.secondary).toBeUndefined();
        });

        it('truncates long subject in preview', () => {
            const longSubject = 'A'.repeat(50);
            const result = smtpTaskPlugin.preview!({
                smtpHost: 'smtp.x.com',
                to: 'a@b.com',
                subject: longSubject,
            });
            expect(result.secondary?.endsWith('…')).toBe(true);
            expect((result.secondary?.length ?? 0)).toBeLessThanOrEqual(31);
        });

        it('falls back to "to" as secondary when subject is empty', () => {
            const result = smtpTaskPlugin.preview!({
                smtpHost: 'smtp.x.com',
                to: 'a@b.com',
            });
            expect(result.secondary).toBe('a@b.com');
        });
    });

    describe('executionSummary', () => {
        it('returns success tone when status is SENT', () => {
            const result = smtpTaskPlugin.executionSummary!({
                parameters: { to: 'a@b.com', subject: 'hi' },
                executionData: { status: 'SENT', to: 'a@b.com', subject: 'hi', sentAt: '2026-08-01T10:00:00Z', smtpHost: 'smtp.x.com', smtpPort: 587 },
                status: 'COMPLETED',
                errorMessage: undefined,
            });
            const statusLine = result?.lines.find(l => l.label === 'Status');
            expect(statusLine?.tone).toBe('success');
        });

        it('returns danger tone when error message is present', () => {
            const result = smtpTaskPlugin.executionSummary!({
                parameters: { to: 'a@b.com', subject: 'hi' },
                executionData: { status: 'FAILED', errorMessage: 'Connection refused' },
                status: 'FAILED',
                errorMessage: 'Connection refused',
            });
            const errorLine = result?.lines.find(l => l.label === 'Error');
            expect(errorLine?.tone).toBe('danger');
        });

        it('formats smtpHost:smtpPort from execution data', () => {
            const result = smtpTaskPlugin.executionSummary!({
                parameters: { smtpHost: 'smtp.x.com' },
                executionData: { status: 'SENT', smtpHost: 'smtp.x.com', smtpPort: 587 },
                status: 'COMPLETED',
                errorMessage: undefined,
            });
            const smtpLine = result?.lines.find(l => l.label === 'SMTP');
            expect(smtpLine?.value).toBe('smtp.x.com:587');
        });
    });

    describe('plugin metadata', () => {
        it('has correct type identifier', () => {
            expect(smtpTaskPlugin.type).toBe('SMTP_TASK');
        });

        it('has a label', () => {
            expect(smtpTaskPlugin.label).toBeTruthy();
        });

        it('exposes required fields: smtpHost, to, subject, fromAddress', () => {
            const fieldKeys = smtpTaskPlugin.fields.map(f => f.key);
            expect(fieldKeys).toContain('smtpHost');
            expect(fieldKeys).toContain('to');
            expect(fieldKeys).toContain('subject');
            expect(fieldKeys).toContain('fromAddress');
        });

        it('marks smtpHost, to, subject, fromAddress as required', () => {
            const requiredKeys = smtpTaskPlugin.fields.filter(f => f.required).map(f => f.key);
            expect(requiredKeys).toContain('smtpHost');
            expect(requiredKeys).toContain('to');
            expect(requiredKeys).toContain('subject');
            expect(requiredKeys).toContain('fromAddress');
        });

        it('defaults smtpPort to 587', () => {
            const portField = smtpTaskPlugin.fields.find(f => f.key === 'smtpPort');
            expect(portField?.defaultValue).toBe(587);
        });

        it('defaults security to STARTTLS', () => {
            const secField = smtpTaskPlugin.fields.find(f => f.key === 'security');
            expect(secField?.defaultValue).toBe('STARTTLS');
        });

        it('defaults bodyFormat to PLAIN', () => {
            const bodyFormatField = smtpTaskPlugin.fields.find(f => f.key === 'bodyFormat');
            expect(bodyFormatField?.defaultValue).toBe('PLAIN');
        });
    });
});
