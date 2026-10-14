import { CircleCheck } from 'lucide-react';
import { defineTaskPlugin } from '../pluginTypes';

export const formEndTaskPlugin = defineTaskPlugin({
    type: 'FORM_END',
    label: 'Form end',
    icon: CircleCheck,
    accentColor: '#059669',
    defaultTaskId: 'form_end',
    fields: [
        {
            key: 'endType',
            label: 'Completion',
            type: 'select',
            required: true,
            defaultValue: 'MESSAGE',
            options: [
                { label: 'Show message', value: 'MESSAGE' },
                { label: 'Redirect', value: 'REDIRECT' },
                { label: 'Custom HTML', value: 'CUSTOM_HTML' },
            ],
        },
        {
            key: 'message',
            label: 'Message',
            type: 'textarea',
            rows: 3,
            defaultValue: 'Thank you for your submission.',
        },
        {
            key: 'redirectUrl',
            label: 'Redirect URL',
            type: 'text',
            defaultValue: '',
        },
        {
            key: 'customHtml',
            label: 'Custom HTML',
            type: 'textarea',
            rows: 4,
            defaultValue: '',
        },
        {
            key: 'continueWorkflowAfterEnd',
            label: 'Continue workflow after form ends',
            type: 'segmented',
            defaultValue: 'true',
            options: [
                { label: 'Yes', value: 'true' },
                { label: 'No', value: 'false' },
            ],
        },
    ],
    validate(parameters, _context, errors) {
        const endType = String(parameters.endType ?? 'MESSAGE');
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
    preview(params) {
        return { primary: String(params.endType ?? 'MESSAGE'), secondary: 'Form completion' };
    },
});
