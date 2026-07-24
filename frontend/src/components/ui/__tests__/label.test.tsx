// Should read the rules before creating/updating the test files
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from '../label';

describe('Label Component', () => {
  it('L-017: Label — associates with input elements', () => {
    render(
      <div>
        <Label htmlFor="test-input">Test Label</Label>
        <input id="test-input" />
      </div>
    );
    
    // Check if the label renders correctly and associates with the input
    const inputElement = screen.getByLabelText('Test Label');
    expect(inputElement).toBeInTheDocument();
    expect(inputElement.tagName).toBe('INPUT');
    expect(inputElement.id).toBe('test-input');
  });
});
