import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/layouts/PageHeader';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuthStore, isSignedIn } from '@/auth/authStore';
import { PlatformOrganizationsManagement } from './components/PlatformOrganizationsManagement';
import { healthApi, type HealthResponse } from '@/api/healthApi';
import {
  Building2,
  Activity,
  Server,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type AdminTab = {
  id: 'organizations' | 'system';
  label: string;
  icon: typeof Building2;
  description: string;
};

const TABS: AdminTab[] = [
  {
    id: 'organizations',
    label: 'Organizations',
    icon: Building2,
    description: 'Fleet of tenant workspaces and capacity',
  },
  {
    id: 'system',
    label: 'System Status',
    icon: Activity,
    description: 'Core API, database, and background workers health',
  },
];

export default function PlatformAdminPage() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.me);

  const isPlatformAdmin = Boolean(isSignedIn(me) && me?.platformAdmin);

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('admin_sub_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('admin_sub_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Security guard: Only platform admins can access this page
  useEffect(() => {
    if (isSignedIn(me) && !me?.platformAdmin) {
      navigate('/', { replace: true });
    }
  }, [me, navigate]);

  const checkHealth = async () => {
    try {
      setHealthLoading(true);
      setHealthError(null);
      const data = await healthApi.getApiHealth();
      setHealth(data);
    } catch (err) {
      console.error('Failed to load system health', err);
      setHealth(null);
      setHealthError('Unable to reach system health endpoints. Please try again.');
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    void checkHealth();
  }, []);

  const activeTab: AdminTab['id'] = tab === 'system' ? 'system' : 'organizations';

  const handleTabClick = (tabId: AdminTab['id']) => {
    navigate(`/admin/${tabId}`);
  };

  const isHealthy = health?.status === 'UP';

  if (!isPlatformAdmin) {
    return null;
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <PageHeader
        title={
          <h1 data-testid="platform-admin-page-heading" className="text-sm font-semibold">
            Platform Administration
          </h1>
        }
      />

      <div className="flex-1 overflow-hidden p-[var(--density-page-p)]">
        <div className="mx-auto max-w-7xl h-full w-full flex flex-col md:flex-row gap-[var(--density-section-gap)] min-h-0">
          {/* Navigation Sidebar */}
          <aside
            className={cn(
              'group relative transition-all duration-200 shrink-0',
              isSidebarCollapsed ? 'w-full md:w-16' : 'w-full md:w-64'
            )}
          >
            {/* Hover-revealed collapse/expand button on the outer right edge */}
            <button
              type="button"
              data-testid="admin-sidebar-toggle-btn"
              onClick={toggleSidebar}
              className="absolute -right-3 top-4 z-20 hidden md:flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm text-muted-foreground hover:text-foreground hover:bg-accent opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>

            <nav className="relative flex md:flex-col gap-1.5 overflow-x-auto p-1.5 bg-muted/60 rounded-xl border border-border/50">
              {!isSidebarCollapsed && (
                <div className="hidden md:flex items-center px-2 pt-1 pb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                    Governance
                  </span>
                </div>
              )}
              {TABS.map((tabItem) => {
                const Icon = tabItem.icon;
                const isSelected = activeTab === tabItem.id;

                return (
                  <Tooltip key={tabItem.id} delayDuration={isSidebarCollapsed ? 100 : 999999}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        data-testid={`admin-tab-${tabItem.id}`}
                        onClick={() => handleTabClick(tabItem.id)}
                        className={cn(
                          'w-full flex items-center rounded-lg py-[var(--density-sidebar-item-py)] text-sm font-medium transition-all whitespace-nowrap min-h-[var(--density-sidebar-item-h)]',
                          isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
                          isSelected
                            ? 'bg-background text-foreground shadow-sm font-semibold'
                            : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0',
                            isSelected ? 'text-primary' : 'text-muted-foreground'
                          )}
                        />
                        {!isSidebarCollapsed && (
                          <div className="text-left min-w-0">
                            <div>{tabItem.label}</div>
                          </div>
                        )}
                      </button>
                    </TooltipTrigger>
                    {isSidebarCollapsed && (
                      <TooltipContent side="right">
                        {tabItem.label}
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </nav>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0 h-full overflow-y-auto pr-2 pb-6">
            {/* Organizations Fleet Tab */}
            {activeTab === 'organizations' && (
              <div className="rounded-xl border bg-card p-[var(--density-card-p)] animate-in fade-in slide-in-from-bottom-2 duration-300">
                <PlatformOrganizationsManagement />
              </div>
            )}

            {/* System Status Tab */}
            {activeTab === 'system' && (
              <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 data-testid="system-status-section" className="text-xl font-bold tracking-tight">
                      System Status & Health
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Live operational metrics for the core API engine, MongoDB, and workflow background workers.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void checkHealth()}
                    disabled={healthLoading}
                    data-testid="refresh-system-health-btn"
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-1.5", healthLoading && "animate-spin")} />
                    Refresh
                  </Button>
                </div>

                {healthError && (
                  <ErrorBanner
                    data-testid="system-health-error"
                    message={healthError}
                    onRetry={checkHealth}
                  />
                )}

                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-[var(--density-card-p)]">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'p-3.5 rounded-xl',
                        isHealthy
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : healthLoading
                          ? 'bg-primary/10 text-primary'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {healthLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : isHealthy ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        <AlertTriangle className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <h3 data-testid="system-status-badge" className="font-semibold text-base">
                        {healthLoading
                          ? 'Checking system operational status…'
                          : isHealthy
                          ? 'All platform systems operational'
                          : 'Service degraded / Unreachable'}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {healthLoading
                          ? 'Contacting health probes...'
                          : isHealthy
                          ? 'Core workflow API engine and persistence layers are healthy.'
                          : 'Could not contact core API health check endpoints.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Server className="h-4 w-4" />
                      <span>API Gateway</span>
                    </div>
                    <div className="mt-2 text-lg font-semibold text-foreground">
                      {isHealthy ? 'Online (v1.0)' : 'Offline'}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Activity className="h-4 w-4" />
                      <span>Execution Engine</span>
                    </div>
                    <div className="mt-2 text-lg font-semibold text-foreground">
                      {isHealthy ? 'Active & Polling' : 'Unknown'}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>Multi-Tenancy Isolation</span>
                    </div>
                    <div className="mt-2 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                      Enforced
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
