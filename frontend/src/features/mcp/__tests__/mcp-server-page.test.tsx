// Should read the rules before creating/updating the test files
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import McpServerPage from '../McpServerPage';
import { mcpSettingsApi } from '@/api/mcpSettingsApi';

vi.mock('@/api/mcpSettingsApi', () => ({
  mcpSettingsApi: {
    get: vi.fn(),
    update: vi.fn(),
    regenerateToken: vi.fn(),
    getLogs: vi.fn().mockResolvedValue({ content: [], totalElements: 0 }),
  },
}));

describe('McpServerPage Layout and Sidebar (Vitest)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[Happy Path] renders vertical tab group with Server subheading and tabs', async () => {
    vi.mocked(mcpSettingsApi.get).mockResolvedValueOnce({
      enabled: true,
      exposureMode: 'GLOBAL',
      globalEndpointPath: '/api/mcp',
      globalEndpointUrl: 'https://example.com/api/mcp',
      allowStdioTransport: false,
      authTokenMasked: 'mcp-***-1234',
    });

    render(
      <MemoryRouter>
        <TooltipProvider>
          <McpServerPage />
        </TooltipProvider>
      </MemoryRouter>
    );

    // Verify sub-heading
    expect(screen.getByText('Server')).toBeInTheDocument();

    // Verify tabs
    expect(screen.getByTestId('mcp-tab-config')).toBeInTheDocument();
    expect(screen.getByTestId('mcp-tab-audit')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Enable MCP server')).toBeInTheDocument();
    });
  });

  it('[Happy Path] renders hover-revealed sidebar toggle on outer edge and toggles collapse state', async () => {
    vi.mocked(mcpSettingsApi.get).mockResolvedValueOnce({
      enabled: true,
      exposureMode: 'GLOBAL',
      globalEndpointPath: '/api/mcp',
      globalEndpointUrl: 'https://example.com/api/mcp',
      allowStdioTransport: false,
      authTokenMasked: 'mcp-***-1234',
    });

    render(
      <MemoryRouter>
        <TooltipProvider>
          <McpServerPage />
        </TooltipProvider>
      </MemoryRouter>
    );

    const toggleBtn = screen.getByTestId('mcp-sidebar-toggle-btn');
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn.className).toContain('opacity-0');
    expect(toggleBtn.className).toContain('group-hover:opacity-100');
    expect(toggleBtn.className).toContain('-right-3');
    expect(toggleBtn).toHaveAttribute('aria-label', 'Collapse sidebar');

    // Click toggle to collapse
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-label', 'Expand sidebar');

    // In collapsed mode, subheading "Server" is hidden
    expect(screen.queryByText('Server')).not.toBeInTheDocument();
  });

  it('[Negative Path] shows friendly error banner and retry option when API fails', async () => {
    vi.mocked(mcpSettingsApi.get).mockRejectedValueOnce(
      new Error('Connection failed')
    );

    render(
      <MemoryRouter>
        <TooltipProvider>
          <McpServerPage />
        </TooltipProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mcp-server-error')).toBeInTheDocument();
    });
    expect(screen.getByText('Unable to load MCP server settings. Please try again.')).toBeInTheDocument();
  });
});
