import { Home, Settings, Workflow, PlayCircle, User, PanelLeftClose, PanelLeft } from 'lucide-react';
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
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const items = [
    { title: 'Home', url: '/', icon: Home },
    { title: 'Workflows', url: '/workflows', icon: Workflow },
    { title: 'Executions', url: '/executions', icon: PlayCircle },
    { title: 'Settings', url: '/settings', icon: Settings },
];

function SidebarCollapseButton() {
    const { state, toggleSidebar } = useSidebar();
    const expanded = state === 'expanded';

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2"
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

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b border-sidebar-border px-2 py-3">
                <div
                    className={cn(
                        'flex w-full items-center gap-2',
                        'group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:justify-center',
                    )}
                >
                    <Link
                        to="/"
                        className="flex min-w-0 flex-1 items-center gap-2 font-bold text-xl text-primary group-data-[collapsible=icon]:flex-none"
                    >
                        <Workflow className="h-6 w-6 shrink-0" />
                        <span className="truncate group-data-[collapsible=icon]:hidden">Flow</span>
                    </Link>
                    <SidebarCollapseButton />
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
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
                                        <Link to={item.url}>
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
                        <SidebarMenuButton
                            size="lg"
                            className="cursor-default"
                            tooltip="Guest User · Member"
                        >
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent ring-1 ring-sidebar-border">
                                <User className="size-4" />
                            </div>
                            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                <span className="truncate font-medium">Guest User</span>
                                <span className="truncate text-xs text-muted-foreground">Member</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
