import { Home, Settings, Workflow, PlayCircle } from "lucide-react"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarHeader,
} from "@/components/ui/sidebar"
import { Link, useLocation } from "react-router-dom"

// Menu items.
const items = [
    {
        title: "Home",
        url: "/",
        icon: Home,
    },
    {
        title: "Workflows",
        url: "/workflows",
        icon: Workflow,
    },
    {
        title: "Executions",
        url: "/executions",
        icon: PlayCircle,
    },
    {
        title: "Settings",
        url: "/settings",
        icon: Settings,
    },
]

export function AppSidebar() {
    const location = useLocation();

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="flex items-center justify-center py-4">
                <div className="flex items-center gap-2 font-bold text-xl text-primary">
                    <Workflow className="h-6 w-6" />
                    <span className="group-data-[collapsible=icon]:hidden">Flow</span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    {/* <SidebarGroupLabel>Application</SidebarGroupLabel> */}
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild isActive={location.pathname === item.url} tooltip={item.title}>
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
        </Sidebar>
    )
}
