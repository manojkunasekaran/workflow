import { 
    Home, 
    Settings, 
    Workflow, 
    PlayCircle, 
    User, 
    PanelLeftClose, 
    PanelLeft, 
    Blocks, 
    KeyRound, 
    Puzzle, 
    Plug, 
    ShieldCheck, 
    ChevronsUpDown, 
    LogOut, 
    Palette 
} from 'lucide-react';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { isSignedIn, useAuthStore } from '@/auth/authStore';

const BASE_ITEMS = [
    { title: 'Home', url: '/', icon: Home },
    { title: 'Workflows', url: '/workflows', icon: Workflow },
    { title: 'Executions', url: '/executions', icon: PlayCircle },
    { title: 'Apps', url: '/apps', icon: Blocks, testId: 'nav-link-apps' },
    { title: 'Integrations', url: '/integrations', icon: Puzzle, testId: 'nav-link-integrations' },
    { title: 'Credentials', url: '/credentials', icon: KeyRound },
    { title: 'MCP Server', url: '/mcp', icon: Plug, testId: 'nav-link-mcp' },
];

function SidebarCollapseButton({ className }: { className?: string }) {
    const { state, toggleSidebar } = useSidebar();
    const expanded = state === 'expanded';

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    data-testid="sidebar-collapse-btn"
                    type="button"
                    className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md outline-none ring-sidebar-ring transition-all focus-visible:ring-2",
                        expanded
                            ? "shrink-0 ml-auto -mr-1 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            : "absolute inset-0 m-auto z-10 bg-sidebar-accent text-sidebar-accent-foreground shadow-xs opacity-0 hover:opacity-100 group-hover/header:opacity-100 focus:opacity-100 cursor-pointer",
                        className
                    )}
                    onClick={toggleSidebar}
                    aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
                >
                    {expanded ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                </button>
            </TooltipTrigger>
            <TooltipContent side="right" align="center">
                {expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            </TooltipContent>
        </Tooltip>
    );
}

export function AppSidebar() {
    const location = useLocation();
    const me = useAuthStore((s) => s.me);
    const logout = useAuthStore((s) => s.logout);
    const signedIn = isSignedIn(me);
    const displayName = signedIn ? (me?.displayName || me?.email || 'User') : 'Not signed in';

    const getSubtitle = (): string => {
        if (!signedIn) return '';
        if (me?.platformAdmin) return 'Platform admin';
        const activeOrg = me?.organizations?.find((o) => o.id === me.activeOrganizationId);
        if (activeOrg?.role === 'ORGANIZATION_ADMIN') return 'Org admin';
        return 'Member';
    };
    const subtitle = getSubtitle();

    const navItems = [
        ...BASE_ITEMS,
        ...(me?.platformAdmin ? [{ title: 'Platform Admin', url: '/admin', icon: ShieldCheck, testId: 'nav-link-admin' }] : []),
        { title: 'Settings', url: '/settings', icon: Settings },
    ];

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b border-sidebar-border px-2 py-3">
                <div
                    className={cn(
                        'group/header relative flex w-full items-center gap-2',
                        'group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0',
                    )}
                >
                    <Link
                        data-testid="nav-logo-link"
                        to="/"
                        className="flex min-w-0 flex-1 items-center gap-2.5 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center"
                    >
                        <Workflow className="h-5 w-5 text-primary shrink-0" />
                        <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
                            <span className="text-sm font-semibold tracking-tight leading-none text-foreground">Workflow</span>
                            <span className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">Make automations</span>
                        </div>
                    </Link>
                    <SidebarCollapseButton />
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={
                                            item.url === '/'
                                                ? location.pathname === '/'
                                                : location.pathname.startsWith(item.url)
                                        }
                                        tooltip={item.title}
                                    >
                                        <Link data-testid={item.testId ?? `nav-link-${item.title.toLowerCase()}`} to={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="cursor-pointer transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                    tooltip={`${displayName} · ${subtitle}`}
                                    data-testid="user-profile-menu-trigger"
                                >
                                    {signedIn && me?.pictureUrl ? (
                                        <img
                                            src={me.pictureUrl}
                                            alt=""
                                            className="size-8 shrink-0 rounded-full object-cover ring-1 ring-sidebar-border"
                                        />
                                    ) : (
                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent ring-1 ring-sidebar-border">
                                            <User className="size-4" />
                                        </div>
                                    )}
                                    <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                        <span className="truncate font-medium">{displayName}</span>
                                        <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
                                    </div>
                                    <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                side="right"
                                align="end"
                                sideOffset={8}
                                className="w-64 rounded-xl p-1.5 shadow-xl border-border/80 bg-popover"
                                data-testid="user-profile-popover"
                            >
                                <DropdownMenuLabel className="p-2 font-normal">
                                    <div className="flex items-center gap-3 text-left">
                                        {signedIn && me?.pictureUrl ? (
                                            <img
                                                src={me.pictureUrl}
                                                alt=""
                                                className="size-9 shrink-0 rounded-full object-cover ring-1 ring-border"
                                            />
                                        ) : (
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted ring-1 ring-border">
                                                <User className="size-4 text-muted-foreground" />
                                            </div>
                                        )}
                                        <div className="grid min-w-0 flex-1 text-sm leading-tight">
                                            <span className="truncate font-semibold text-foreground">{displayName}</span>
                                            <span className="truncate text-xs text-muted-foreground">{me?.email ?? ''}</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-[11px] text-muted-foreground">Current role</span>
                                        <span className={cn(
                                            "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                            me?.platformAdmin
                                                ? "bg-primary/10 text-primary border border-primary/20"
                                                : subtitle === 'Org admin'
                                                ? "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                                                : "bg-muted text-muted-foreground"
                                        )}>
                                            {subtitle}
                                        </span>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="my-1" />
                                <DropdownMenuItem asChild>
                                    <Link to="/settings/profile" className="cursor-pointer flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm">
                                        <User className="size-4 text-muted-foreground" />
                                        <span>Profile</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link to="/settings/appearance" className="cursor-pointer flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm">
                                        <Palette className="size-4 text-muted-foreground" />
                                        <span>Appearance</span>
                                    </Link>
                                </DropdownMenuItem>
                                {me?.platformAdmin && (
                                    <DropdownMenuItem asChild>
                                        <Link to="/admin" className="cursor-pointer flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium text-primary">
                                            <ShieldCheck className="size-4" />
                                            <span>Platform Admin</span>
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className="my-1" />
                                <DropdownMenuItem
                                    className="cursor-pointer text-destructive focus:text-destructive flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm"
                                    data-testid="sign-out-btn"
                                    onClick={() => {
                                        void logout().then(() => {
                                            window.location.href = '/login';
                                        });
                                    }}
                                >
                                    <LogOut className="size-4" />
                                    <span>Sign out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
