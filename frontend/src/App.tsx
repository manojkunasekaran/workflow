import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import AppLayout from '@/layouts/AppLayout';
import LandingPage from '@/features/landing/LandingPage';
import WorkflowListPage from '@/features/workflows/WorkflowListPage';
import WorkflowStudioPage from '@/features/workflow-studio/WorkflowStudioPage';
import ExecutionsList from '@/features/executions/ExecutionsList';
import ExecutionDetail from '@/features/executions/ExecutionDetail';
import SettingsPage from '@/features/settings/SettingsPage';
import IntegrationsPage from '@/features/integrations/IntegrationsPage';
import CredentialsPage from '@/features/credentials/CredentialsPage';
import OAuthCallbackPage from '@/features/oauth/OAuthCallbackPage';

const router = createBrowserRouter([
    {
        path: '/oauth-callback',
        element: <OAuthCallbackPage />,
    },
    {
        path: '/',
        element: <AppLayout />,
        children: [
            { index: true, element: <LandingPage /> },
            { path: 'workflows', element: <WorkflowListPage /> },
            { path: 'workflows/:id', element: <WorkflowStudioPage /> },
            { path: 'executions', element: <ExecutionsList /> },
            { path: 'executions/:id', element: <ExecutionDetail /> },
            { path: 'integrations', element: <IntegrationsPage /> },
            { path: 'credentials', element: <CredentialsPage /> },
            { path: 'connections', element: <Navigate to="/credentials" replace /> },
            { path: 'settings', element: <SettingsPage /> },
            { path: 'admin', element: <Navigate to="/integrations" replace /> },
            { path: '*', element: <LandingPage /> },
        ],
    },
]);

function App() {
    return (
        <ThemeProvider defaultTheme="light" storageKey="workflow-theme">
            <TooltipProvider delayDuration={350}>
                <RouterProvider router={router} />
            </TooltipProvider>
        </ThemeProvider>
    );
}

export default App;
