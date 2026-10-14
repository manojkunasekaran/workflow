import { FormInput } from 'lucide-react';
import { defineTaskPlugin } from '../pluginTypes';
import { defaultFormPageSchema } from '@/types/form';
import { normalizeFormSchema } from '@/features/forms/lib/formSchemaUtils';

export const formPageTaskPlugin = defineTaskPlugin({
    type: 'FORM_PAGE',
    label: 'Form page',
    icon: FormInput,
    accentColor: '#0d9488',
    defaultTaskId: 'form_page',
    fields: [
        {
            key: 'page',
            label: 'Page design',
            type: 'formSchema',
            required: true,
            defaultValue: defaultFormPageSchema(),
        },
    ],
    validate(parameters, _context, errors) {
        const page = normalizeFormSchema(parameters.page);
        const fields = page.pages[0]?.fields ?? [];
        if (fields.length === 0) {
            errors.page = 'Add at least one field';
        }
        const keys = new Set<string>();
        for (const f of fields) {
            if (!f.key?.trim()) {
                errors.page = 'Every field needs a key';
                return;
            }
            if (keys.has(f.key)) {
                errors.page = `Duplicate field key: ${f.key}`;
                return;
            }
            keys.add(f.key);
        }
    },
    normalize(parameters) {
        return { ...parameters, page: normalizeFormSchema(parameters.page) };
    },
    preview(params) {
        const page = normalizeFormSchema(params.page);
        const title = page.pages[0]?.title ?? 'Form page';
        const count = page.pages[0]?.fields?.length ?? 0;
        return { primary: title, secondary: `${count} field(s)` };
    },
});
