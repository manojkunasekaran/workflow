import { useState, useEffect } from 'react';
import { healthApi, type HealthResponse } from '@/api/healthApi';
import { PageHeader } from '@/layouts/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, Server, User, Activity, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppearanceSettings } from '@/features/settings/components/AppearanceSettings';
import { OrgBrandingSettings } from '@/features/settings/components/OrgBrandingSettings';
import { PlatformOrganizationsSettings } from '@/features/settings/components/PlatformOrganizationsSettings';
import { isSignedIn, useAuthStore } from '@/auth/authStore';

type SettingsTab = {
    id: string;
    label: string;
    icon: typeof User;
    platformAdminOnly?: boolean;
};

const BASE_TABS: SettingsTab[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'organizations', label: 'Organizations', icon: Building2, platformAdminOnly: true },
    { id: 'organization', label: 'Organization branding', icon: Building2 },
    { id: 'system', label: 'System status', icon: Activity },
];

export default function SettingsPage() {
    const me = useAuthStore((s) => s.me);
    const tabs = BASE_TABS.filter(
        (tab) => !tab.platformAdminOnly || (isSignedIn(me) && me?.platformAdmin),
    );
    const [activeTab, setActiveTab] = useState<string>('profile');
    const [health, setHealth] = useState<HealthResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const loadHealth = async () => {
            try {
                setHealth(await healthApi.getApiHealth());
            } catch (err) {
                console.error('Failed to load API health', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadHealth();
    }, []);

    const isHealthy = health?.status === 'UP';

    return (
        <div className="flex h-full flex-col bg-background">
            <PageHeader title={<h1 data-testid="settings-page-heading" className="text-sm font-semibold">Settings</h1>} />

            <div className="flex-1 overflow-hidden p-[var(--density-page-p)]">
                <div className="mx-auto max-w-6xl h-full w-full flex flex-col md:flex-row gap-[var(--density-section-gap)] min-h-0">
                    
                    <aside className="w-full md:w-52 shrink-0">
                        <nav className="flex md:flex-col gap-1 overflow-x-auto p-1 bg-muted rounded-lg">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    data-testid={`settings-tab-${tab.id}`}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-3 rounded-md px-3 py-[var(--density-sidebar-item-py)] text-sm font-medium transition-colors whitespace-nowrap min-h-[var(--density-sidebar-item-h)]",
                                        activeTab === tab.id 
                                            ? "bg-background text-foreground shadow-sm" 
                                            : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                                    )}
                                >
                                    <tab.icon className="h-4 w-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </aside>

                    <div className="flex-1 min-w-0 h-full overflow-y-auto pr-2 pb-6">
                        {activeTab === 'profile' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <section className="space-y-3">
                                    <div>
                                        <h2 data-testid="profile-settings-section" className="text-lg font-medium tracking-tight">Profile</h2>
                                        <p className="text-sm text-muted-foreground">Your name and contact details.</p>
                                    </div>
                                    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-[var(--density-card-p)]">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            <div className="flex flex-col items-center gap-3">
                                                {me?.pictureUrl ? (
                                                    <img
                                                        src={me.pictureUrl}
                                                        alt=""
                                                        className="h-20 w-20 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                        <span className="text-2xl font-semibold">
                                                            {(me?.displayName || me?.email || '?').charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="name">Full name</Label>
                                                    <Input
                                                        id="name"
                                                        data-testid="full-name-input"
                                                        readOnly
                                                        value={me?.displayName ?? ''}
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="email">Email</Label>
                                                    <Input
                                                        id="email"
                                                        data-testid="email-input"
                                                        type="email"
                                                        readOnly
                                                        value={me?.email ?? ''}
                                                    />
                                                </div>
                                                {me?.authMode === 'OAUTH' ? (
                                                    <p className="text-xs text-muted-foreground">
                                                        Your profile comes from your sign-in provider.
                                                    </p>
                                                ) : null}
                                                {me?.authMode === 'DEMO' ? (
                                                    <p className="text-xs text-muted-foreground">
                                                        Demo session — not for production use.
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-3">
                                    <div>
                                        <h2 data-testid="user-preferences-section" className="text-lg font-medium tracking-tight">Look &amp; feel</h2>
                                        <p className="text-sm text-muted-foreground">Theme, colors, and layout.</p>
                                    </div>
                                    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-[var(--density-card-p)]">
                                        <AppearanceSettings />
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'organizations' && (
                            <div className="rounded-xl border bg-card p-[var(--density-card-p)] animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <PlatformOrganizationsSettings />
                            </div>
                        )}

                        {activeTab === 'organization' && (
                            <div className="rounded-xl border bg-card p-[var(--density-card-p)] animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <OrgBrandingSettings />
                            </div>
                        )}

                        {activeTab === 'system' && (
                            <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div>
                                    <h2 data-testid="system-status-section" className="text-lg font-medium tracking-tight">System status</h2>
                                    <p className="text-sm text-muted-foreground">Platform health from the API.</p>
                                </div>
                                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-[var(--density-card-p)]">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-full ${isHealthy ? 'bg-success-muted text-success' : isLoading ? 'bg-info-muted text-info' : 'bg-danger-muted text-danger'}`}>
                                            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : isHealthy ? <ShieldCheck className="h-6 w-6" /> : <Server className="h-6 w-6" />}
                                        </div>
                                        <div>
                                            <h3 data-testid="system-status-badge" className="font-semibold text-base">
                                                {isLoading ? 'Checking status…' : isHealthy ? 'All systems operational' : 'Service degraded'}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                {isLoading ? 'Connecting to backend services' : isHealthy ? 'API and workers are running.' : 'Could not reach core services.'}
                                            </p>
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
