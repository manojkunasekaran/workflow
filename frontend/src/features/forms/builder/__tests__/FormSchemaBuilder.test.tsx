import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormSchemaBuilder } from '@/features/forms/builder/FormSchemaBuilder';
import type { FormSchema } from '@/types/form';

describe('FormSchemaBuilder Component', () => {
    const mockSchema: FormSchema = {
        pages: [
            {
                pageId: 'page_1',
                title: 'User Onboarding',
                layoutMode: 'STACK',
                fields: [
                    {
                        key: 'full_name',
                        type: 'TEXT',
                        label: 'Full Name',
                        required: true,
                    },
                    {
                        key: 'contact_email',
                        type: 'EMAIL',
                        label: 'Work Email',
                        required: false,
                    },
                ],
            },
        ],
    };

    it('renders header toolbar with title, layout selector, and design/preview mode toggles', () => {
        const onChange = vi.fn();
        render(<FormSchemaBuilder value={mockSchema} onChange={onChange} />);

        // Page title input
        const titleInput = screen.getByDisplayValue('User Onboarding');
        expect(titleInput).toBeDefined();

        // Mode toggles
        expect(screen.getByRole('button', { name: /design/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /live preview/i })).toBeDefined();
    });

    it('renders 3 panes in design mode: palette, canvas, and inspector', () => {
        const onChange = vi.fn();
        render(<FormSchemaBuilder value={mockSchema} onChange={onChange} />);

        // Pane 1: Palette
        expect(screen.getByText('Add field')).toBeDefined();
        expect(screen.getByRole('button', { name: /short text/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /dropdown/i })).toBeDefined();

        // Pane 2: Canvas / Field List
        expect(screen.getByText('Full Name')).toBeDefined();
        expect(screen.getByText('Work Email')).toBeDefined();

        // Pane 3: Field settings / Inspector
        expect(screen.getByText('Field settings')).toBeDefined();
        expect(screen.getByDisplayValue('full_name')).toBeDefined();
    });

    it('toggles to Live Preview mode and renders the interactive form', () => {
        const onChange = vi.fn();
        render(<FormSchemaBuilder value={mockSchema} onChange={onChange} />);

        const previewButton = screen.getByRole('button', { name: /live preview/i });
        fireEvent.click(previewButton);

        expect(screen.getByText('Interactive Form Preview')).toBeDefined();
        // In preview mode, FormRenderer renders the form
        expect(screen.getByRole('button', { name: /submit/i })).toBeDefined();
    });

    it('renders empty state when no fields are present', () => {
        const onChange = vi.fn();
        const emptySchema: FormSchema = {
            pages: [
                {
                    pageId: 'page_1',
                    title: 'Empty Page',
                    fields: [],
                },
            ],
        };
        render(<FormSchemaBuilder value={emptySchema} onChange={onChange} />);

        expect(screen.getByText('No fields added yet')).toBeDefined();
        expect(screen.getByText('Pick a field type from the left to start.')).toBeDefined();
        expect(screen.getByText('Select a field from the list to customize its settings')).toBeDefined();
    });

    it('adds a field when clicking palette button', () => {
        const onChange = vi.fn();
        render(<FormSchemaBuilder value={mockSchema} onChange={onChange} />);

        const addDropdownBtn = screen.getByRole('button', { name: /dropdown/i });
        fireEvent.click(addDropdownBtn);

        expect(onChange).toHaveBeenCalledTimes(1);
        const updatedSchema = onChange.mock.calls[0][0] as FormSchema;
        expect(updatedSchema.pages[0].fields.some((f) => f.type === 'SELECT')).toBe(true);
    });
});
