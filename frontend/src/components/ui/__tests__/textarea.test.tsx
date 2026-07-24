// Should read the rules before creating/updating the test files
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Textarea } from '../textarea';

describe('Textarea Component', () => {
  it('L-009: Textarea — accepts user input and applies custom styles', () => {
    render(<Textarea data-testid="test-textarea" className="custom-style" />);
    
    const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
    expect(textarea).toHaveClass('custom-style');
    
    fireEvent.change(textarea, { target: { value: 'test content' } });
    expect(textarea.value).toBe('test content');
  });
});
