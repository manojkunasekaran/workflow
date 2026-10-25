import { describe, it, expect } from 'vitest';
import { formTaskPlugin } from '../formTaskPlugin';
import type { FormSchema } from '@/types/form';

describe('formTaskPlugin', () => {
    it('defines correct plugin metadata', () => {
        expect(formTaskPlugin.type).toBe('FORM');
        expect(formTaskPlugin.label).toBe('Form');
        expect(formTaskPlugin.accentColor).toBe('#0d9488');
        expect(formTaskPlugin.defaultTaskId).toBe('form');
    });

    it('contains all required fields with expected defaults and no legacy fields', () => {
        const fields = formTaskPlugin.fields;
        const keys = fields.map((f) => f.key);

        expect(keys).not.toContain('formMode');
        expect(keys).not.toContain('continueWorkflow');

        expect(keys).toContain('page');
        expect(keys).toContain('endType');
        expect(keys).toContain('message');
        expect(keys).toContain('redirectUrl');
        expect(keys).toContain('customHtml');

        const pageField = fields.find((f) => f.key === 'page');
        expect(pageField?.type).toBe('formSchema');
        expect(pageField?.hideIf).toBeUndefined();

        const endTypeField = fields.find((f) => f.key === 'endType');
        expect(endTypeField?.label).toBe('On submit completion');
        expect(endTypeField?.defaultValue).toBe('MESSAGE');
        expect(endTypeField?.options).toEqual([
            { label: 'Show message', value: 'MESSAGE' },
            { label: 'Redirect to URL', value: 'REDIRECT' },
            { label: 'Custom HTML', value: 'CUSTOM_HTML' },
        ]);

        const messageField = fields.find((f) => f.key === 'message');
        expect(messageField?.defaultValue).toBe('Thank you for your submission.');
    });

    it('correctly handles hideIf logic for completion fields based on endType', () => {
        const fields = formTaskPlugin.fields;
        const messageField = fields.find((f) => f.key === 'message');
        const redirectUrlField = fields.find((f) => f.key === 'redirectUrl');
        const customHtmlField = fields.find((f) => f.key === 'customHtml');

        // Default or MESSAGE completion
        const defaultParams = {};
        expect(messageField?.hideIf?.(defaultParams)).toBe(false);
        expect(redirectUrlField?.hideIf?.(defaultParams)).toBe(true);
        expect(customHtmlField?.hideIf?.(defaultParams)).toBe(true);

        const messageParams = { endType: 'MESSAGE' };
        expect(messageField?.hideIf?.(messageParams)).toBe(false);
        expect(redirectUrlField?.hideIf?.(messageParams)).toBe(true);
        expect(customHtmlField?.hideIf?.(messageParams)).toBe(true);

        // REDIRECT completion
        const redirectParams = { endType: 'REDIRECT' };
        expect(messageField?.hideIf?.(redirectParams)).toBe(true);
        expect(redirectUrlField?.hideIf?.(redirectParams)).toBe(false);
        expect(customHtmlField?.hideIf?.(redirectParams)).toBe(true);

        // CUSTOM_HTML completion
        const customHtmlParams = { endType: 'CUSTOM_HTML' };
        expect(messageField?.hideIf?.(customHtmlParams)).toBe(true);
        expect(redirectUrlField?.hideIf?.(customHtmlParams)).toBe(true);
        expect(customHtmlField?.hideIf?.(customHtmlParams)).toBe(false);
    });

    describe('validation', () => {
        it('validates page fields', () => {
            const emptyPageErrors: Record<string, string> = {};
            formTaskPlugin.validate!({ page: { pages: [{ fields: [] }] } }, undefined, emptyPageErrors);
            expect(emptyPageErrors.page).toBe('Add at least one field');

            const missingKeyErrors: Record<string, string> = {};
            formTaskPlugin.validate!(
                {
                    page: { pages: [{ fields: [{ key: '', type: 'TEXT' }] }] },
                },
                undefined,
                missingKeyErrors,
            );
            expect(missingKeyErrors.page).toBe('Every field needs a key');

            const duplicateKeyErrors: Record<string, string> = {};
            formTaskPlugin.validate!(
                {
                    page: {
                        pages: [
                            {
                                fields: [
                                    { key: 'name', type: 'TEXT' },
                                    { key: 'name', type: 'EMAIL' },
                                ],
                            },
                        ],
                    },
                },
                undefined,
                duplicateKeyErrors,
            );
            expect(duplicateKeyErrors.page).toBe('Duplicate field key: name');

            const validErrors: Record<string, string> = {};
            formTaskPlugin.validate!(
                {
                    page: { pages: [{ fields: [{ key: 'name', type: 'TEXT' }] }] },
                    message: 'Thanks',
                },
                undefined,
                validErrors,
            );
            expect(Object.keys(validErrors).length).toBe(0);
        });

        it('validates completion parameters', () => {
            const redirectErrors: Record<string, string> = {};
            formTaskPlugin.validate!(
                {
                    page: { pages: [{ fields: [{ key: 'name', type: 'TEXT' }] }] },
                    endType: 'REDIRECT',
                    redirectUrl: '',
                },
                undefined,
                redirectErrors,
            );
            expect(redirectErrors.redirectUrl).toBe('Redirect URL is required');

            const messageErrors: Record<string, string> = {};
            formTaskPlugin.validate!(
                {
                    page: { pages: [{ fields: [{ key: 'name', type: 'TEXT' }] }] },
                    endType: 'MESSAGE',
                    message: '',
                },
                undefined,
                messageErrors,
            );
            expect(messageErrors.message).toBe('Message is required');

            const htmlErrors: Record<string, string> = {};
            formTaskPlugin.validate!(
                {
                    page: { pages: [{ fields: [{ key: 'name', type: 'TEXT' }] }] },
                    endType: 'CUSTOM_HTML',
                    customHtml: '',
                },
                undefined,
                htmlErrors,
            );
            expect(htmlErrors.customHtml).toBe('Custom HTML is required');
        });
    });

    describe('preview & normalize', () => {
        it('normalizes form schema and strips legacy parameters', () => {
            const normalized = formTaskPlugin.normalize!({
                formMode: 'INPUT',
                continueWorkflow: false,
                endType: 'NONE',
                page: { pages: [{ title: 'Feedback', fields: [{ key: 'comments', type: 'TEXTAREA' }] }] },
            });
            expect(normalized.page).toBeDefined();
            expect((normalized.page as FormSchema).pages[0].fields[0].key).toBe('comments');
            expect(normalized.formMode).toBeUndefined();
            expect(normalized.continueWorkflow).toBeUndefined();
            expect(normalized.endType).toBeUndefined();
        });

        it('preserves configured endType on normalize', () => {
            const normalized = formTaskPlugin.normalize!({
                endType: 'REDIRECT',
                redirectUrl: 'https://example.com',
                page: { pages: [{ fields: [{ key: 'a', type: 'TEXT' }] }] },
            });
            expect(normalized.endType).toBe('REDIRECT');
            expect(normalized.redirectUrl).toBe('https://example.com');
        });

        it('returns preview according to page and completion configuration', () => {
            const basicPreview = formTaskPlugin.preview!({
                page: { pages: [{ title: 'Survey', fields: [{ key: 'a', type: 'TEXT' }] }] },
            });
            expect(basicPreview.primary).toBe('Survey');
            expect(basicPreview.secondary).toBe('1 field(s)');

            const defaultTitlePreview = formTaskPlugin.preview!({
                page: { pages: [{ fields: [{ key: 'a', type: 'TEXT' }] }] },
            });
            expect(defaultTitlePreview.primary).toBe('Form page');
            expect(defaultTitlePreview.secondary).toBe('1 field(s)');

            const completedPreview = formTaskPlugin.preview!({
                page: { pages: [{ title: 'Onboarding', fields: [{ key: 'a', type: 'TEXT' }, { key: 'b', type: 'TEXT' }] }] },
                endType: 'MESSAGE',
            });
            expect(completedPreview.primary).toBe('Onboarding');
            expect(completedPreview.secondary).toBe('2 field(s) · Complete: MESSAGE');

            const redirectPreview = formTaskPlugin.preview!({
                page: { pages: [{ title: 'Onboarding', fields: [{ key: 'a', type: 'TEXT' }] }] },
                endType: 'REDIRECT',
            });
            expect(redirectPreview.primary).toBe('Onboarding');
            expect(redirectPreview.secondary).toBe('1 field(s) · Complete: REDIRECT');
        });
    });
});
