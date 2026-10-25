import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FormRenderer } from '@/features/forms/FormRenderer';
import type { FormPageDefinition } from '@/types/form';

describe('FormRenderer Component', () => {
    const mockPage: FormPageDefinition = {
        title: 'Customer Survey',
        submitButtonLabel: 'Complete Survey',
        fields: [
            {
                key: 'username',
                type: 'TEXT',
                label: 'Username',
                required: true,
                placeholder: 'Enter your username',
            },
            {
                key: 'comments',
                type: 'TEXTAREA',
                label: 'Comments',
                placeholder: 'Write feedback...',
            },
            {
                key: 'newsletter',
                type: 'CHECKBOX',
                label: 'Subscribe to newsletter',
            },
        ],
    };

    it('renders page title and fields correctly', () => {
        const onSubmit = vi.fn();
        render(<FormRenderer page={mockPage} onSubmit={onSubmit} />);

        expect(screen.getByText('Customer Survey')).toBeDefined();
        expect(screen.getByText('Username')).toBeDefined();
        expect(screen.getByPlaceholderText('Enter your username')).toBeDefined();
        expect(screen.getByPlaceholderText('Write feedback...')).toBeDefined();
        expect(screen.getByLabelText('Subscribe to newsletter')).toBeDefined();
        expect(screen.getByRole('button', { name: 'Complete Survey' })).toBeDefined();
    }, 10000);

    it('validates required fields before submitting', async () => {
        const onSubmit = vi.fn();
        render(<FormRenderer page={mockPage} onSubmit={onSubmit} />);

        const submitBtn = screen.getByRole('button', { name: 'Complete Survey' });
        await act(async () => {
            fireEvent.click(submitBtn);
        });

        expect(onSubmit).not.toHaveBeenCalled();
        expect(screen.getByText(/Username is required/i)).toBeDefined();
    }, 10000);

    it('calls onSubmit with answers when valid', async () => {
        const onSubmit = vi.fn();
        render(<FormRenderer page={mockPage} onSubmit={onSubmit} />);

        const usernameInput = screen.getByPlaceholderText('Enter your username');
        await act(async () => {
            fireEvent.change(usernameInput, { target: { value: 'alice_smith' } });
        });

        const submitBtn = screen.getByRole('button', { name: 'Complete Survey' });
        await act(async () => {
            fireEvent.click(submitBtn);
        });

        expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({ username: 'alice_smith' }),
        );
    }, 10000);

    it('renders in GRID layout mode without errors', () => {
        const onSubmit = vi.fn();
        const gridPage: FormPageDefinition = {
            ...mockPage,
            layoutMode: 'GRID',
        };
        const { container } = render(<FormRenderer page={gridPage} onSubmit={onSubmit} />);

        expect(container.querySelector('.react-grid-layout')).toBeDefined();
    }, 10000);
});

