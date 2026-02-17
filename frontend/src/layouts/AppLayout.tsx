import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/layouts/AppSidebar"
import { Header } from "@/layouts/Header"
import { Outlet } from "react-router-dom"

export default function AppLayout() {
    return (
        <SidebarProvider>
            <AppSidebar />
            <main className="flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out w-full">
                <Header />
                <div className="flex-1 w-full">
                    <Outlet />
                </div>
            </main>
        </SidebarProvider>
    )
}
