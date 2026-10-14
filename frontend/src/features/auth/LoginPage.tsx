import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { authApi, type AuthSignInOptions, type DemoSignInRole } from '@/api/authApi';
import { isSignedIn, useAuthStore } from '@/auth/authStore';
import { useOrganizationStore } from '@/organization/organizationStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const me = useAuthStore((s) => s.me);
  const applyMe = useAuthStore((s) => s.applyMe);
  const bootstrap = useOrganizationStore((s) => s.bootstrap);
  const [options, setOptions] = useState<AuthSignInOptions | null>(null);
  const [loadingRole, setLoadingRole] = useState<DemoSignInRole | null>(null);
  const error = params.get('error');

  useEffect(() => {
    if (isSignedIn(me)) {
      navigate('/', { replace: true });
    }
  }, [me, navigate]);

  useEffect(() => {
    void authApi.signInOptions().then(setOptions);
  }, []);

  const onDemo = async (role: DemoSignInRole) => {
    setLoadingRole(role);
    try {
      const signedIn = await authApi.signInAsDemo(role);
      applyMe(signedIn);
      await bootstrap();
      navigate('/', { replace: true });
    } finally {
      setLoadingRole(null);
    }
  };

  const subtitle =
    options?.mode === 'DEMO'
      ? 'Choose a demo role to explore the product.'
      : 'Sign in to your workspace.';

  const hasAnyOption =
    options &&
    (options.demoAdminSignInAvailable ||
      options.demoUserSignInAvailable ||
      options.oauthSignInAvailable);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <img src="/logo.png" alt="" className="mx-auto h-10 w-10 object-contain invert dark:invert-0" />
          <h1 className="text-xl font-semibold">Welcome</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {error ? (
          <p className="text-center text-sm text-destructive" data-testid="login-error">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col gap-3">
          {options?.demoAdminSignInAvailable ? (
            <Button
              type="button"
              className="w-full"
              data-testid="demo-admin-sign-in-btn"
              disabled={loadingRole !== null}
              onClick={() => void onDemo('admin')}
            >
              {loadingRole === 'admin'
                ? 'Please wait…'
                : (options.demoAdminSignInLabel ?? 'Log in as admin')}
            </Button>
          ) : null}
          {options?.demoUserSignInAvailable ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              data-testid="demo-user-sign-in-btn"
              disabled={loadingRole !== null}
              onClick={() => void onDemo('user')}
            >
              {loadingRole === 'user'
                ? 'Please wait…'
                : (options.demoUserSignInLabel ?? 'Log in as user')}
            </Button>
          ) : null}
          {options?.oauthSignInAvailable ? (
            <Button
              type="button"
              className="w-full"
              data-testid="account-sign-in-btn"
              onClick={() => {
                window.location.href = authApi.accountSignInUrl();
              }}
            >
              {options.oauthSignInLabel ?? 'Continue with Google'}
            </Button>
          ) : null}
          {options && !hasAnyOption ? (
            <p className="text-center text-sm text-muted-foreground">Sign-in is not available right now.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
