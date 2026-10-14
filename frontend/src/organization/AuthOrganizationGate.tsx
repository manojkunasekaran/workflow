import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isSignedIn, useAuthStore } from '@/auth/authStore';
import { useOrganizationStore } from '@/organization/organizationStore';

export function AuthOrganizationGate() {
  const location = useLocation();
  const me = useAuthStore((s) => s.me);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const orgHydrated = useOrganizationStore((s) => s.hydrated);
  const currentOrganizationId = useOrganizationStore((s) => s.currentOrganizationId);

  if (!authHydrated || !orgHydrated) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
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
