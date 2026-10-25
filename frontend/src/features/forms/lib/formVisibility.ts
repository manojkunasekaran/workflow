import type { FormFieldDefinition } from '@/types/form';

/**
 * Minimal visibility rules for builder/runtime (full SpEL server-side is phase 2).
 * Supports: `fieldKey == 'value'`, `fieldKey == true`, `fieldKey == false`
 */
export function isFieldVisible(field: FormFieldDefinition, answers: Record<string, unknown>): boolean {
    const expr = field.visibleWhen?.trim();
    if (!expr) {
        return true;
    }
    const stringMatch = /^([a-zA-Z0-9_]+)\s*==\s*'([^']*)'$/.exec(expr);
    if (stringMatch) {
        const [, key, expected] = stringMatch;
        return String(answers[key] ?? '') === expected;
    }
    const boolMatch = /^([a-zA-Z0-9_]+)\s*==\s*(true|false)$/i.exec(expr);
    if (boolMatch) {
        const [, key, expected] = boolMatch;
        return Boolean(answers[key]) === (expected.toLowerCase() === 'true');
    }
    return true;
}
