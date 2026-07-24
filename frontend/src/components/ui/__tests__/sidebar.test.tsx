import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent } from '../sidebar';

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

describe('Sidebar Component', () => {
  it('L-015: Sidebar — expands and collapses correctly', () => {
    // Testing the primitive sidebar UI mechanics
    render(
      <SidebarProvider defaultOpen={true}>
        <Sidebar data-testid="test-sidebar">
          <SidebarContent>Sidebar Content</SidebarContent>
        </Sidebar>
        <SidebarTrigger data-testid="sidebar-trigger" />
      </SidebarProvider>
    );
    
    const sidebarInner = screen.getByTestId('test-sidebar');
    // Initially open based on defaultOpen
    const wrapper = sidebarInner.parentElement;
    expect(wrapper).toHaveAttribute('data-state', 'expanded');

    // Toggle
    const trigger = screen.getByTestId('sidebar-trigger');
    fireEvent.click(trigger);
    
    // Should now be collapsed
    expect(wrapper).toHaveAttribute('data-state', 'collapsed');
  });
});
