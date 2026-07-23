import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/layouts/AppSidebar';
import { Outlet } from 'react-router-dom';

export default function AppLayout() {
    return (
        <SidebarProvider>
            <AppSidebar />
            <main data-testid="app-layout-main" className="flex min-h-screen w-full flex-1 flex-col transition-all duration-300 ease-in-out">
                <div className="flex min-h-0 w-full flex-1 flex-col">
                    <Outlet />
                </div>
            </main>
        </SidebarProvider>
    );
}
