// Should read the rules before creating/updating the test files
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { OrgMembersSettings } from '../components/OrgMembersSettings';
import { orgMembersApi } from '@/api/orgMembersApi';
import { useOrganizationStore } from '@/organization/organizationStore';
import { AuthOrganizationGate } from '@/organization/AuthOrganizationGate';
import SettingsPage from '../SettingsPage';

vi.mock('@/api/orgMembersApi', () => ({
  orgMembersApi: {
    listMembers: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
    updateRole: vi.fn(),
  },
}));

vi.mock('@/api/brandingApi', () => ({
  brandingApi: {
    get: vi.fn().mockResolvedValue({ accentPresetId: 'default', logoUrl: null, lockAccent: false }),
    update: vi.fn().mockResolvedValue({ accentPresetId: 'default', logoUrl: null, lockAccent: false }),
    uploadLogo: vi.fn(),
  },
}));

vi.mock('@/auth/authStore', () => ({
  useAuthStore: vi.fn((selector) =>
    selector({
      me: {
        userId: 'u1',
        email: 'admin@org.local',
        displayName: 'Org Admin',
        platformAdmin: true,
        activeOrganizationId: 'org-1',
        organizations: [
          { id: 'org-1', role: 'ORGANIZATION_ADMIN', name: 'Test Org' },
        ],
      },
      hydrated: true,
      refreshMe: vi.fn(),
    }),
  ),
  isSignedIn: vi.fn(() => true),
  getActiveOrgRole: vi.fn(() => 'ORGANIZATION_ADMIN'),
}));

describe('Settings Error Banners and Robustness (Vitest)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OrgMembersSettings', () => {
    it('[Happy Path] renders member list and header actions when API call succeeds', async () => {
      vi.mocked(orgMembersApi.listMembers).mockResolvedValueOnce([
        {
          id: 'm-1',
          userId: 'u-1',
          organizationId: 'org-1',
          email: 'member@test.com',
          role: 'MEMBER',
          createdAt: new Date().toISOString(),
        },
      ]);

      render(
        <TooltipProvider>
          <OrgMembersSettings />
        </TooltipProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('member@test.com')).toBeInTheDocument();
      });
      expect(screen.getByTestId('refresh-members-btn')).toBeInTheDocument();
      expect(screen.getByTestId('open-add-member-dialog-btn')).toBeInTheDocument();
      expect(screen.queryByTestId('org-members-error')).not.toBeInTheDocument();
    });

    it('[Negative Path] shows ErrorBanner without technical details and hides empty state when API fails', async () => {
      vi.mocked(orgMembersApi.listMembers).mockRejectedValueOnce(
        new Error('SQLSyntaxErrorException: fatal query failure'),
      );

      render(
        <TooltipProvider>
          <OrgMembersSettings />
        </TooltipProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('org-members-error')).toBeInTheDocument();
      });

      // Must NOT leak internal technical details
      expect(screen.queryByText(/SQLSyntaxErrorException/)).not.toBeInTheDocument();
      expect(screen.getByText('Unable to load organization members. Please try again.')).toBeInTheDocument();

      // Must NOT show empty placeholders or table when API fails
      expect(screen.queryByText('No members found')).not.toBeInTheDocument();
      expect(screen.queryByTestId('members-table')).not.toBeInTheDocument();
    });

    it('[Edge Case] retries loading members when Retry button is clicked', async () => {
      vi.mocked(orgMembersApi.listMembers)
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce([
          {
            id: 'm-2',
            userId: 'u-2',
            organizationId: 'org-1',
            email: 'recovered@test.com',
            role: 'ORGANIZATION_ADMIN',
            createdAt: new Date().toISOString(),
          },
        ]);

      render(
        <TooltipProvider>
          <OrgMembersSettings />
        </TooltipProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('org-members-error')).toBeInTheDocument();
      });

      const retryBtn = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByText('recovered@test.com')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('org-members-error')).not.toBeInTheDocument();
    });

    it('[Happy Path] opens popup dialog on Add member button click and allows adding member', async () => {
      vi.mocked(orgMembersApi.listMembers).mockResolvedValueOnce([]);
      vi.mocked(orgMembersApi.addMember).mockResolvedValueOnce({
        id: 'm-new',
        userId: 'new-user@test.com',
        organizationId: 'org-1',
        email: 'new-user@test.com',
        role: 'MEMBER',
        createdAt: new Date().toISOString(),
      });

      render(
        <TooltipProvider>
          <OrgMembersSettings />
        </TooltipProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('open-add-member-dialog-btn')).toBeInTheDocument();
      });

      // Open the popup dialog
      fireEvent.click(screen.getByTestId('open-add-member-dialog-btn'));

      expect(screen.getByTestId('add-member-dialog')).toBeInTheDocument();
      const input = screen.getByTestId('new-member-user-id-input');
      fireEvent.change(input, { target: { value: 'new-user@test.com' } });

      const submitBtn = screen.getByTestId('add-member-btn');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getAllByText('new-user@test.com').length).toBeGreaterThan(0);
      });
    });
  });

  describe('AuthOrganizationGate loading and error handling', () => {
    it('[Happy Path] renders spinner instead of plain text Loading… while hydrating', () => {
      useOrganizationStore.setState({
        hydrated: false,
        bootstrapError: null,
      });

      render(
        <MemoryRouter>
          <AuthOrganizationGate>
            <div data-testid="protected-content">Content</div>
          </AuthOrganizationGate>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('app-loading-spinner')).toBeInTheDocument();
      expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    });

    it('[Negative Path] renders ErrorBanner without technical details and with retry on bootstrap error', () => {
      useOrganizationStore.setState({
        hydrated: true,
        bootstrapError: 'Connection refused: ECONNREFUSED 127.0.0.1:27017',
      });

      render(
        <MemoryRouter>
          <AuthOrganizationGate>
            <div data-testid="protected-content">Content</div>
          </AuthOrganizationGate>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('app-bootstrap-error')).toBeInTheDocument();
      expect(screen.getByText('Unable to load your session. Please check your connection and try again.')).toBeInTheDocument();
      // Must NOT leak internal technical details like ECONNREFUSED
      expect(screen.queryByText(/ECONNREFUSED/)).not.toBeInTheDocument();
      expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    });
  });

  describe('SettingsPage Layout & Sidebar Controls', () => {
    it('[Happy Path] renders clean header and stable sidebar navigation tabs', () => {
      render(
        <MemoryRouter>
          <TooltipProvider>
            <SettingsPage />
          </TooltipProvider>
        </MemoryRouter>,
      );

      // Verify header heading exists
      expect(screen.getByTestId('settings-page-heading')).toBeInTheDocument();

      // Verify account navigation tabs exist
      expect(screen.getByTestId('settings-tab-profile')).toBeInTheDocument();
      expect(screen.getByTestId('settings-tab-appearance')).toBeInTheDocument();

      // Verify hover-revealed sidebar collapse toggle exists on outer edge
      const toggleBtn = screen.getByTestId('settings-sidebar-toggle-btn');
      expect(toggleBtn).toBeInTheDocument();
    });
  });
});
