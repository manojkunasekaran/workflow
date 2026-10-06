import { useState, useEffect } from 'react';
import { healthApi, type HealthResponse } from '@/api/healthApi';
import { PageHeader } from '@/layouts/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Moon, Sun, Monitor, ShieldCheck, Server, User, Activity } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

const TABS = [
    { id: 'profile', label: 'Profile Settings', icon: User },
    { id: 'system', label: 'System Status', icon: Activity },
] as const;

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<string>('profile');
    const [health, setHealth] = useState<HealthResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { theme, setTheme } = useTheme();

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

            <div className="flex-1 overflow-hidden p-6">
                <div className="mx-auto max-w-6xl h-full w-full flex flex-col md:flex-row gap-8 min-h-0">
                    
                    {/* Sidebar Tabs */}
                    <aside className="w-full md:w-52 shrink-0">
                        <nav className="flex md:flex-col gap-1 overflow-x-auto p-1 bg-muted rounded-lg">
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
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

                    {/* Content Area */}
                    <div className="flex-1 min-w-0 h-full overflow-y-auto pr-2 pb-6">
                        {activeTab === 'profile' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <section className="space-y-3">
                                    <div>
                                        <h2 data-testid="profile-settings-section" className="text-lg font-medium tracking-tight">Profile Settings</h2>
                                        <p className="text-sm text-muted-foreground">Manage your personal information and security.</p>
                                    </div>
                                    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-5">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                    <span className="text-2xl font-semibold">JD</span>
                                                </div>
                                                <Button variant="outline" size="sm">Change Avatar</Button>
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="name">Full Name</Label>
                                                    <Input id="name" data-testid="full-name-input" defaultValue="John Doe" />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="email">Email Address</Label>
                                                    <Input id="email" data-testid="email-input" type="email" defaultValue="john.doe@example.com" />
                                                </div>
                                                <div className="pt-1">
                                                    <Button data-testid="update-profile-btn">Update Profile</Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-3">
                                    <div>
                                        <h2 data-testid="user-preferences-section" className="text-lg font-medium tracking-tight">User Preferences</h2>
                                    </div>
                                    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-5 space-y-4">
                                        <div className="space-y-2">
                                            <Label>Appearance</Label>
                                            <div className="flex flex-wrap gap-3">
                                                <Button 
                                                    data-testid="theme-light-btn"
                                                    variant={theme === 'light' ? 'default' : 'outline'}
                                                    onClick={() => setTheme('light')}
                                                    className="w-32"
                                                >
                                                    <Sun className="mr-2 h-4 w-4" /> Light
                                                </Button>
                                                <Button 
                                                    data-testid="theme-dark-btn"
                                                    variant={theme === 'dark' ? 'default' : 'outline'}
                                                    onClick={() => setTheme('dark')}
                                                    className="w-32"
                                                >
                                                    <Moon className="mr-2 h-4 w-4" /> Dark
                                                </Button>
                                                <Button 
                                                    data-testid="theme-system-btn"
                                                    variant={theme === 'system' ? 'default' : 'outline'}
                                                    onClick={() => setTheme('system')}
                                                    className="w-32"
                                                >
                                                    <Monitor className="mr-2 h-4 w-4" /> System
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'system' && (
                            <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div>
                                    <h2 data-testid="system-status-section" className="text-lg font-medium tracking-tight">System Status</h2>
                                    <p className="text-sm text-muted-foreground">Current health of the workflow platform.</p>
                                </div>
                                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-full ${isHealthy ? 'bg-green-100 text-green-600' : isLoading ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                                            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : isHealthy ? <ShieldCheck className="h-6 w-6" /> : <Server className="h-6 w-6" />}
                                        </div>
                                        <div>
                                            <h3 data-testid="system-status-badge" className="font-semibold text-base">
                                                {isLoading ? 'Checking status...' : isHealthy ? 'All Systems Operational' : 'System Offline / Degraded'}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                {isLoading ? 'Connecting to backend services' : isHealthy ? 'API and all background workers are running smoothly.' : 'There is an issue connecting to the core services.'}
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
