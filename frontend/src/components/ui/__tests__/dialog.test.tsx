// Should read the rules before creating/updating the test files
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from '../dialog';
import { useState } from 'react';

describe('Dialog Component', () => {
  afterEach(cleanup);

  it('L-003: renders content in a portal when open', async () => {
    const TestComponent = () => {
      const [open, setOpen] = useState(false);
      return (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
            <p>Dialog Content String</p>
          </DialogContent>
        </Dialog>
      );
    };

    render(<TestComponent />);
    
    // Initially not in document
    expect(screen.queryByText('Dialog Content String')).not.toBeInTheDocument();
    
    // Click to open
    const button = screen.getByText('Open Dialog');
    button.click();

    // Now it should be in the document
    const content = await screen.findByText('Dialog Content String');
    expect(content).toBeInTheDocument();
    expect(screen.getByText('Dialog Title')).toBeInTheDocument();
  });
});
