import { FormInput } from 'lucide-react';
import { defineTaskPlugin } from '../pluginTypes';
import { defaultFormPageSchema, type FormEndType } from '@/types/form';
import { normalizeFormSchema } from '@/features/forms/lib/formSchemaUtils';

export const formTaskPlugin = defineTaskPlugin({
    type: 'FORM',
    label: 'Form',
    icon: FormInput,
    accentColor: '#0d9488',
    defaultTaskId: 'form',
    fields: [
        {
            key: 'page',
            label: 'Page design',
            type: 'formSchema',
            defaultValue: defaultFormPageSchema(),
        },
        {
            key: 'endType',
            label: 'On submit completion',
            type: 'select',
            defaultValue: 'MESSAGE',
            options: [
                { label: 'Show message', value: 'MESSAGE' },
                { label: 'Redirect to URL', value: 'REDIRECT' },
                { label: 'Custom HTML', value: 'CUSTOM_HTML' },
            ],
        },
        {
            key: 'message',
            label: 'Message',
            type: 'textarea',
            rows: 3,
            defaultValue: 'Thank you for your submission.',
            hideIf: (p) => (p.endType ?? 'MESSAGE') !== 'MESSAGE',
        },
        {
            key: 'redirectUrl',
            label: 'Redirect URL',
            type: 'text',
            defaultValue: '',
            hideIf: (p) => p.endType !== 'REDIRECT',
        },
        {
            key: 'customHtml',
            label: 'Custom HTML',
            type: 'textarea',
            rows: 4,
            defaultValue: '',
            hideIf: (p) => p.endType !== 'CUSTOM_HTML',
        },
    ],
    validate(parameters, _context, errors) {
        const page = normalizeFormSchema(parameters.page);
        const fields = page.pages[0]?.fields ?? [];
        if (fields.length === 0) {
            errors.page = 'Add at least one field';
        } else {
            const keys = new Set<string>();
            for (const f of fields) {
                if (!f.key?.trim()) {
                    errors.page = 'Every field needs a key';
                    break;
                }
                if (keys.has(f.key)) {
                    errors.page = `Duplicate field key: ${f.key}`;
                    break;
                }
                keys.add(f.key);
            }
        }

        const endType = parameters.endType as FormEndType | undefined;
        if (endType === 'REDIRECT' && !String(parameters.redirectUrl ?? '').trim()) {
            errors.redirectUrl = 'Redirect URL is required';
        }
        if (endType === 'MESSAGE' && !String(parameters.message ?? '').trim()) {
            errors.message = 'Message is required';
        }
        if (endType === 'CUSTOM_HTML' && !String(parameters.customHtml ?? '').trim()) {
            errors.customHtml = 'Custom HTML is required';
        }
    },
    normalize(parameters) {
        const { formMode: _f, continueWorkflow: _c, ...rest } = parameters;
        const endType = parameters.endType === 'NONE' ? undefined : (parameters.endType as FormEndType | undefined);
        const result: Record<string, unknown> = {
            ...rest,
            page: normalizeFormSchema(parameters.page),
        };
        if (endType !== undefined) {
            result.endType = endType;
        } else {
            delete result.endType;
        }
        return result;
    },
    preview(params) {
        const page = normalizeFormSchema(params.page);
        const title = page.pages[0]?.title ?? 'Form page';
        const count = page.pages[0]?.fields?.length ?? 0;
        const endType = params.endType;

        if (endType && endType !== 'NONE') {
            return {
                primary: title,
                secondary: `${count} field(s) · Complete: ${endType}`,
            };
        }

        return {
            primary: title,
            secondary: `${count} field(s)`,
        };
    },
});
