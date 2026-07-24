// Should read the rules before creating/updating the test files
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Input } from '../input';

describe('Input Component', () => {
  afterEach(cleanup);

  it('L-004: accepts and displays text values', () => {
    render(<Input placeholder="Enter text" />);
    
    const input = screen.getByPlaceholderText('Enter text') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    
    fireEvent.change(input, { target: { value: 'Hello world' } });
    expect(input.value).toBe('Hello world');
  });
});
