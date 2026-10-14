import { describe, expect, it } from 'vitest';
import { isFieldVisible } from '@/features/forms/lib/formVisibility';
import type { FormFieldDefinition } from '@/types/form';

describe('isFieldVisible', () => {
    const field: FormFieldDefinition = { key: 'x', type: 'TEXT', visibleWhen: "tier == 'pro'" };

    it('shows when expression matches', () => {
        expect(isFieldVisible(field, { tier: 'pro' })).toBe(true);
        expect(isFieldVisible(field, { tier: 'basic' })).toBe(false);
    });

    it('shows when no rule', () => {
        expect(isFieldVisible({ key: 'y', type: 'TEXT' }, {})).toBe(true);
    });
});
