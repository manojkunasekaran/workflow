// Should read the rules before creating/updating the test files
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StudioNodeShell } from '../StudioNodeShell';
import { Activity } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';

describe('StudioNodeShell Component', () => {
  afterEach(cleanup);

  it('K-026: renders validation error ring when node has errors', () => {
    const { container } = render(
      <TooltipProvider>
        <StudioNodeShell
          iconBoxHeight={64}
          totalHeight={64}
          accentColor="#ff0000"
          icon={Activity}
          label="Test Node"
          invalid={true}
          errorMessage="Required field missing"
        >
          <div>Content</div>
        </StudioNodeShell>
      </TooltipProvider>
    );

    // Using querySelector to find the border container since it's structurally styled
    const outerWrapper = container.querySelector('.rounded-\\[16px\\]') as HTMLElement;
    expect(outerWrapper).toBeInTheDocument();
    
    // When invalid=true, resolveStudioNodeBorder returns 'border-destructive'
    // Let's verify the outer wrapper has these validation classes
    expect(outerWrapper.className).toContain('border-destructive');
  });

  it('renders normally without validation error ring when valid', () => {
    const { container } = render(
      <TooltipProvider>
        <StudioNodeShell
          iconBoxHeight={64}
          totalHeight={64}
          accentColor="#ff0000"
          icon={Activity}
          label="Test Node"
          invalid={false}
        >
          <div>Content</div>
        </StudioNodeShell>
      </TooltipProvider>
    );

    const outerWrapper = container.querySelector('.rounded-\\[16px\\]') as HTMLElement;
    expect(outerWrapper.className).not.toContain('border-destructive');
  });
});
