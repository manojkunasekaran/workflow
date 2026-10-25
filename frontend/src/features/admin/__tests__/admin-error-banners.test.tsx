// Should read the rules before creating/updating the test files
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PlatformOrganizationsManagement } from '../components/PlatformOrganizationsManagement';
import PlatformAdminPage from '../PlatformAdminPage';
import { organizationApi } from '@/api/organizationApi';
import { healthApi } from '@/api/healthApi';

vi.mock('@/api/organizationApi', () => ({
  organizationApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/api/healthApi', () => ({
  healthApi: {
    getApiHealth: vi.fn(),
  },
}));

vi.mock('@/auth/authStore', () => ({
  useAuthStore: vi.fn((selector) =>
    selector({
      me: {
        userId: 'admin-1',
        email: 'platform-admin@example.com',
        displayName: 'Platform Admin',
        platformAdmin: true,
      },
    }),
  ),
  isSignedIn: vi.fn(() => true),
}));

vi.mock('@/organization/organizationStore', () => ({
  useOrganizationStore: vi.fn((selector) =>
    selector({
      currentOrganizationId: 'org-1',
      organizations: [],
      switchOrganization: vi.fn(),
    }),
  ),
}));

describe('Platform Admin Error Banners and Robustness (Vitest)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PlatformOrganizationsManagement', () => {
    it('[Happy Path] renders organizations table when API call succeeds', async () => {
      vi.mocked(organizationApi.list).mockResolvedValueOnce([
        {
          id: 'org-1',
          name: 'Acme Corp',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      render(
        <TooltipProvider>
          <PlatformOrganizationsManagement />
        </TooltipProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      });
      expect(screen.getByTestId('refresh-orgs-fleet-btn')).toBeInTheDocument();
      expect(screen.queryByTestId('platform-orgs-error')).not.toBeInTheDocument();
    });

    it('[Negative Path] shows ErrorBanner without technical details and hides search and empty state when API fails', async () => {
      vi.mocked(organizationApi.list).mockRejectedValueOnce(
        new Error('Fatal database connection error: MongoTimeoutException 10000ms'),
      );

      render(
        <TooltipProvider>
          <PlatformOrganizationsManagement />
        </TooltipProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('platform-orgs-error')).toBeInTheDocument();
      });

      // Must NOT leak internal technical details
      expect(screen.queryByText(/MongoTimeoutException/)).not.toBeInTheDocument();
      expect(screen.getByText('Unable to load organizations. Please try again.')).toBeInTheDocument();

      // Must NOT show empty placeholder or table search when in error state
      expect(screen.queryByText('No organizations found')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Filter organizations by name or ID...')).not.toBeInTheDocument();
    });

    it('[Edge Case] retries loading organizations when Retry button is clicked', async () => {
      vi.mocked(organizationApi.list)
        .mockRejectedValueOnce(new Error('Gateway timeout'))
        .mockResolvedValueOnce([
          {
            id: 'org-2',
            name: 'Beta Global',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);

      render(
        <TooltipProvider>
          <PlatformOrganizationsManagement />
        </TooltipProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('platform-orgs-error')).toBeInTheDocument();
      });

      const retryBtn = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByText('Beta Global')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('platform-orgs-error')).not.toBeInTheDocument();
    });
  });

  describe('PlatformAdminPage Header & Sidebar', () => {
    it('[Happy Path] renders header without icon or header actions, and has hover-reveal sidebar collapse button', async () => {
      vi.mocked(healthApi.getApiHealth).mockResolvedValueOnce({
        status: 'UP',
        components: {},
      });
      vi.mocked(organizationApi.list).mockResolvedValueOnce([]);

      render(
        <MemoryRouter>
          <TooltipProvider>
            <PlatformAdminPage />
          </TooltipProvider>
        </MemoryRouter>,
      );

      // Verify page heading exists
      const heading = screen.getByTestId('platform-admin-page-heading');
      expect(heading).toBeInTheDocument();
      expect(heading.textContent).toBe('Platform Administration');

      // Verify no SVG icon inside the heading container
      expect(heading.querySelector('svg')).toBeNull();

      // Verify NO header refresh action button (kept in respective tabs)
      expect(screen.queryByTestId('refresh-admin-btn')).not.toBeInTheDocument();

      // Verify hover-revealed sidebar collapse toggle exists on outer edge
      const toggleBtn = screen.getByTestId('admin-sidebar-toggle-btn');
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn.className).toContain('opacity-0');
      expect(toggleBtn.className).toContain('group-hover:opacity-100');
      expect(toggleBtn.className).toContain('-right-3');

      // Toggling the sidebar updates state
      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute('aria-label', 'Expand sidebar');
    });
  });
});
