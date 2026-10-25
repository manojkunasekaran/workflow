import type { FormFieldDefinition, FormFieldType, FormLayoutMode, FormPageDefinition, FormSchema } from '@/types/form';
import { isFieldVisible } from '@/features/forms/lib/formVisibility';

export const FORM_FIELD_TYPES: { type: FormFieldType; label: string; disabled?: boolean }[] = [
    { type: 'TEXT', label: 'Short text' },
    { type: 'TEXTAREA', label: 'Long text' },
    { type: 'EMAIL', label: 'Email' },
    { type: 'NUMBER', label: 'Number' },
    { type: 'PHONE', label: 'Phone' },
    { type: 'SELECT', label: 'Dropdown' },
    { type: 'MULTI_SELECT', label: 'Multi select' },
    { type: 'RADIO', label: 'Radio' },
    { type: 'CHECKBOX', label: 'Checkbox' },
    { type: 'DATE', label: 'Date' },
    { type: 'DATETIME', label: 'Date & time' },
    { type: 'HIDDEN', label: 'Hidden' },
    { type: 'CONSENT', label: 'Consent' },
    { type: 'SECTION_HEADER', label: 'Section header' },
    { type: 'FILE', label: 'File upload (coming soon)', disabled: true },
];

export function newFieldKey(existing: FormFieldDefinition[]): string {
    const base = 'field';
    let i = existing.length + 1;
    const keys = new Set(existing.map((f) => f.key));
    while (keys.has(`${base}_${i}`)) i += 1;
    return `${base}_${i}`;
}

export function createField(type: FormFieldType, existing: FormFieldDefinition[]): FormFieldDefinition {
    const key = newFieldKey(existing);
    return {
        key,
        type,
        label: FORM_FIELD_TYPES.find((t) => t.type === type)?.label ?? type,
        required: type !== 'SECTION_HEADER' && type !== 'HIDDEN',
        layout: { x: 0, y: existing.length, w: 12, h: 1 },
        options: type === 'SELECT' || type === 'RADIO' ? ['Option 1', 'Option 2'] : undefined,
    };
}

export function normalizeFormSchema(value: unknown): FormSchema {
    if (!value || typeof value !== 'object') {
        return { pages: [{ pageId: 'page', title: 'Page', fields: [], layoutMode: 'STACK' }] };
    }
    const raw = value as FormSchema;
    const pages = Array.isArray(raw.pages) && raw.pages.length > 0
        ? raw.pages
        : [{ pageId: 'page', title: 'Page', fields: [], layoutMode: 'STACK' }];
    return {
        pages: pages.map((p) => ({
            ...p,
            layoutMode: (p.layoutMode ?? 'STACK') as FormLayoutMode,
            fields: Array.isArray(p.fields) ? p.fields : [],
        })),
    };
}

export function singlePageSchema(schema: FormSchema): FormPageDefinition {
    const page = schema.pages[0] ?? { fields: [], layoutMode: 'STACK' };
    return page;
}

export function updateSinglePage(schema: FormSchema, page: FormPageDefinition): FormSchema {
    const pages = [...(schema.pages ?? [])];
    if (pages.length === 0) pages.push(page);
    else pages[0] = page;
    return { pages };
}

export function validateFormPage(
    page: FormPageDefinition,
    answers: Record<string, unknown>,
): string | null {
    const fields = page.fields ?? [];
    for (const field of fields) {
        if (field.type === 'SECTION_HEADER' || field.type === 'HIDDEN') continue;
        if (!isFieldVisible(field, answers)) continue;
        if (field.type === 'FILE') {
            return 'File upload is not available yet.';
        }
        const value = answers[field.key] ?? field.defaultValue;
        if (field.type === 'CHECKBOX' || field.type === 'CONSENT') {
            if (field.required && value !== true) {
                return `${field.label ?? field.key} is required`;
            }
            continue;
        }
        if (field.required && (value == null || String(value).trim() === '')) {
            return `${field.label ?? field.key} is required`;
        }
    }
    return null;
}

export function hasRespondableFields(page: FormPageDefinition): boolean {
    return (page.fields ?? []).some(
        (f) => f.type !== 'SECTION_HEADER' && f.type !== 'HIDDEN',
    );
}
