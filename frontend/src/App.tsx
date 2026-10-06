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
import AppsPage from '@/features/apps/AppsPage';
import ConnectorBuilderPage from '@/features/settings/connectors/ConnectorBuilderPage';
import CredentialsPage from '@/features/credentials/CredentialsPage';
import OAuthCallbackPage from '@/features/oauth/OAuthCallbackPage';
import IntegrationDetailPage from '@/features/integrations/IntegrationDetailPage';
import McpServerPage from '@/features/mcp/McpServerPage';

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
            { path: 'apps', element: <AppsPage /> },
            { path: 'apps/:connectorId', element: <ConnectorBuilderPage scope="TENANT" /> },
            { path: 'integrations', element: <IntegrationsPage /> },
            { path: 'integrations/:id', element: <IntegrationDetailPage /> },
            { path: 'credentials', element: <CredentialsPage /> },
            { path: 'mcp', element: <McpServerPage /> },
            { path: 'settings', element: <SettingsPage /> },
            { path: 'admin', element: <Navigate to="/apps" replace /> },
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
