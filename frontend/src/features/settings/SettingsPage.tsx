import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { AuthMeResponse } from '@/api/authApi';
import { PageHeader } from '@/layouts/PageHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    User,
    Palette,
    Paintbrush,
    Building2,
    Users,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppearanceSettings } from '@/features/settings/components/AppearanceSettings';
import { OrgBrandingSettings } from '@/features/settings/components/OrgBrandingSettings';
import { OrgMembersSettings } from '@/features/settings/components/OrgMembersSettings';
import { isSignedIn, useAuthStore } from '@/auth/authStore';

type SettingsTab = {
    id: string;
    label: string;
    icon: typeof User;
    testId?: string;
    orgAdminOnly?: boolean;
};

type SettingsSection = {
    id: 'account' | 'organization';
    title: string;
    subtitle?: string;
    icon?: typeof Building2;
    orgAdminOnly?: boolean;
    tabs: SettingsTab[];
};

const SECTIONS: SettingsSection[] = [
    {
        id: 'account',
        title: 'Account',
        tabs: [
            { id: 'profile', label: 'Profile', icon: User, testId: 'settings-tab-profile' },
            { id: 'appearance', label: 'Appearance', icon: Palette, testId: 'settings-tab-appearance' },
        ],
    },
    {
        id: 'organization',
        title: 'Organization',
        icon: Building2,
        orgAdminOnly: true,
        tabs: [
            { id: 'branding', label: 'Branding', icon: Paintbrush, testId: 'settings-tab-organization' },
            { id: 'members', label: 'Members', icon: Users, testId: 'settings-tab-members' },
        ],
    },
];

const ALL_TABS: SettingsTab[] = SECTIONS.flatMap((s) => s.tabs);

const getActiveOrgRole = (me: AuthMeResponse | null) => {
    if (!me?.activeOrganizationId) return null;
    return me.organizations?.find((o) => o.id === me.activeOrganizationId)?.role ?? null;
};

export default function SettingsPage() {
    const { tab } = useParams<{ tab?: string }>();
    const navigate = useNavigate();
    const me = useAuthStore((s) => s.me);

    const isPlatformAdmin = Boolean(isSignedIn(me) && me?.platformAdmin);
    const isOrgAdmin = getActiveOrgRole(me) === 'ORGANIZATION_ADMIN';
    const hasOrgAccess = isPlatformAdmin || isOrgAdmin;

    const activeOrgName = me?.organizations?.find((o) => o.id === me?.activeOrganizationId)?.name;

    // Resolve active tab from URL param or default to 'profile'
    const resolveTab = (rawTab?: string): string => {
        if (!rawTab) return 'profile';
        if (rawTab === 'organization') return 'branding';
        return rawTab;
    };

    const activeTab = resolveTab(tab);

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        try {
            return localStorage.getItem('settings_sub_sidebar_collapsed') === 'true';
        } catch {
            return false;
        }
    });

    const toggleSidebar = () => {
        setIsSidebarCollapsed((prev) => {
            const next = !prev;
            try {
                localStorage.setItem('settings_sub_sidebar_collapsed', String(next));
            } catch {}
            return next;
        });
    };

    // Guard against navigating to tabs without permission, and redirect platform admin tabs to /admin
    useEffect(() => {
        if (tab === 'organizations' || tab === 'system') {
            if (isPlatformAdmin) {
                navigate(`/admin/${tab}`, { replace: true });
            } else {
                navigate('/settings/profile', { replace: true });
            }
            return;
        }

        const activeDef = ALL_TABS.find((t) => t.id === activeTab);
        if (!activeDef) return;
        if (activeDef.orgAdminOnly && !hasOrgAccess) {
            navigate('/settings/profile', { replace: true });
        }
    }, [tab, activeTab, isPlatformAdmin, hasOrgAccess, navigate]);

    const handleTabClick = (tabId: string) => {
        navigate(`/settings/${tabId}`);
    };

    // Filter visible sections based on user role
    const visibleSections = SECTIONS.filter((section) => {
        if (section.orgAdminOnly && !hasOrgAccess) return false;
        return true;
    });

    return (
        <div className="flex h-full flex-col bg-background">
            <PageHeader
                title={<h1 data-testid="settings-page-heading" className="text-sm font-semibold">Settings</h1>}
            />

            <div className="flex-1 overflow-hidden p-[var(--density-page-p)]">
                <div className="mx-auto max-w-6xl h-full w-full flex flex-col md:flex-row gap-[var(--density-section-gap)] min-h-0">
                    {/* Left Categorized Navigation */}
                    <aside
                        className={cn(
                            'group relative transition-all duration-200 shrink-0',
                            isSidebarCollapsed ? 'w-full md:w-16' : 'w-full md:w-64',
                        )}
                    >
                        {/* Hover-revealed collapse/expand button on the outer right edge */}
                        <button
                            type="button"
                            data-testid="settings-sidebar-toggle-btn"
                            onClick={toggleSidebar}
                            className="absolute -right-3 top-4 z-20 hidden md:flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm text-muted-foreground hover:text-foreground hover:bg-accent opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {isSidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                        </button>

                        <nav className="flex md:flex-col gap-2.5 overflow-x-auto p-1.5 bg-muted/60 rounded-xl border border-border/50">
                            {visibleSections.map((section, sectionIdx) => (
                                <div key={section.id} className="space-y-1 w-full">
                                    {!isSidebarCollapsed && (
                                        <div className="px-3 pt-2 pb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                                            <div className="flex items-center gap-1.5">
                                                {section.icon && <section.icon className="h-3.5 w-3.5 text-primary" />}
                                                <span>{section.title}</span>
                                            </div>
                                            {section.id === 'organization' && activeOrgName && (
                                                <span className="text-[10px] font-normal normal-case text-muted-foreground truncate max-w-[90px]" title={activeOrgName}>
                                                    {activeOrgName}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {isSidebarCollapsed && sectionIdx > 0 && (
                                        <div className="my-1 border-t border-border/40 mx-2" />
                                    )}
                                    <div className="space-y-0.5">
                                        {section.tabs.map((tabItem) => {
                                            const isSelected = activeTab === tabItem.id;
                                            return (
                                                <Tooltip key={tabItem.id} delayDuration={isSidebarCollapsed ? 100 : 999999}>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            type="button"
                                                            data-testid={tabItem.testId ?? `settings-tab-${tabItem.id}`}
                                                            onClick={() => handleTabClick(tabItem.id)}
                                                            className={cn(
                                                                'w-full flex items-center rounded-lg py-[var(--density-sidebar-item-py)] text-sm font-medium transition-all whitespace-nowrap min-h-[var(--density-sidebar-item-h)]',
                                                                isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
                                                                isSelected
                                                                    ? 'bg-background text-foreground shadow-sm font-semibold'
                                                                    : 'text-muted-foreground hover:bg-background/50 hover:text-foreground',
                                                            )}
                                                        >
                                                            <tabItem.icon className={cn('h-4 w-4 shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                                                            {!isSidebarCollapsed && <span>{tabItem.label}</span>}
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
                                    </div>
                                </div>
                            ))}
                        </nav>
                    </aside>

                    {/* Right Content Panel */}
                    <div className="flex-1 min-w-0 h-full overflow-y-auto pr-2 pb-6">
                        {/* 1. Profile Tab */}
                        {activeTab === 'profile' && (
                          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div>
                                    <h2 data-testid="profile-settings-section" className="text-lg font-medium tracking-tight">Profile</h2>
                                    <p className="text-sm text-muted-foreground">Your account details and contact information.</p>
                                </div>
                                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-[var(--density-card-p)]">
                                    <div className="flex flex-col md:flex-row gap-6">
                                        <div className="flex flex-col items-center gap-3">
                                            {me?.pictureUrl ? (
                                                <img
                                                    src={me.pictureUrl}
                                                    alt=""
                                                    className="h-20 w-20 rounded-full object-cover ring-2 ring-border"
                                                />
                                            ) : (
                                                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-primary/20">
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
                                                    Your profile information is synchronized from your single sign-on provider.
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* 2. Appearance Tab */}
                        {activeTab === 'appearance' && (
                            <div className="rounded-xl border bg-card p-[var(--density-card-p)] animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <AppearanceSettings />
                            </div>
                        )}

                        {/* 3. Organization Branding Tab */}
                        {activeTab === 'branding' && (
                            <div className="rounded-xl border bg-card p-[var(--density-card-p)] animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <OrgBrandingSettings />
                            </div>
                        )}

                        {/* 4. Organization Members Tab */}
                        {activeTab === 'members' && (
                            <div className="rounded-xl border bg-card p-[var(--density-card-p)] animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <OrgMembersSettings />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
