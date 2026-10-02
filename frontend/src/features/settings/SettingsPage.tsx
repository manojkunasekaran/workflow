import { useEffect, useState } from 'react';
import { healthApi, type HealthResponse } from '@/api/healthApi';
import { PageHeader } from '@/layouts/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Moon, Sun, Monitor, ShieldCheck, Server } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { McpServerSettingsSection } from '@/features/settings/components/McpServerSettingsSection';

export default function SettingsPage() {
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

            <div className="flex-1 overflow-auto p-6">
                <div className="mx-auto max-w-4xl space-y-8">
                    
                    {/* Profile Settings */}
                    <section className="space-y-4">
                        <div>
                            <h2 data-testid="profile-settings-section" className="text-lg font-medium tracking-tight">Profile Settings</h2>
                            <p className="text-sm text-muted-foreground">Manage your personal information and security.</p>
                        </div>
                        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <span className="text-3xl font-semibold">JD</span>
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
                                    <div className="pt-2">
                                        <Button data-testid="update-profile-btn">Update Profile</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* User Preferences */}
                    <section className="space-y-4">
                        <div>
                            <h2 data-testid="user-preferences-section" className="text-lg font-medium tracking-tight">User Preferences</h2>
                            <p className="text-sm text-muted-foreground">Customize your workflow experience.</p>
                        </div>
                        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-6">
                            <div className="space-y-3">
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

                    {/* MCP Server */}
                    <section className="space-y-4">
                        <div>
                            <h2 data-testid="mcp-server-settings-section" className="text-lg font-medium tracking-tight">MCP Server</h2>
                            <p className="text-sm text-muted-foreground">Configure inbound MCP tool exposure for external clients.</p>
                        </div>
                        <McpServerSettingsSection />
                    </section>

                    {/* System Health (Simplified) */}
                    <section className="space-y-4">
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

                </div>
            </div>
        </div>
    );
}
