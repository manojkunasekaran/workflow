import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isSignedIn, useAuthStore } from '@/auth/authStore';
import { useOrganizationStore } from '@/organization/organizationStore';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Loader2 } from 'lucide-react';

export function AuthOrganizationGate() {
  const location = useLocation();
  const me = useAuthStore((s) => s.me);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const orgHydrated = useOrganizationStore((s) => s.hydrated);
  const bootstrapError = useOrganizationStore((s) => s.bootstrapError);
  const bootstrap = useOrganizationStore((s) => s.bootstrap);
  const currentOrganizationId = useOrganizationStore((s) => s.currentOrganizationId);

  if (bootstrapError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <ErrorBanner
            data-testid="app-bootstrap-error"
            title="Failed to load session"
            message="Unable to load your session. Please check your connection and try again."
            onRetry={() => void bootstrap()}
            retryLabel="Retry"
          />
        </div>
      </div>
    );
  }

  if (!authHydrated || !orgHydrated) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground" data-testid="app-loading-spinner">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isSignedIn(me)) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!currentOrganizationId) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-sm text-muted-foreground">
        No organization on your account. Contact a platform administrator.
      </div>
    );
  }

  return <Outlet />;
}
