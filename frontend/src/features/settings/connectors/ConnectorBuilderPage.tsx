import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import ConnectorBuilder, { type ConnectorAutosaveState } from './ConnectorBuilder';
import { ConnectorGeneralInfoCard } from './ConnectorGeneralInfoCard';
import { EditConnectorGeneralDialog } from './EditConnectorGeneralDialog';
import { connectorApi, type ConnectorManifest } from '@/api/connectorApi';
import { PageHeader } from '@/layouts/PageHeader';
import { PageBreadcrumb } from '@/layouts/PageBreadcrumb';
import { ErrorBanner } from '@/components/ui/error-banner';

interface ConnectorBuilderPageProps {
    scope: 'SYSTEM' | 'TENANT';
}

export default function ConnectorBuilderPage({ scope }: ConnectorBuilderPageProps) {
    const { connectorId } = useParams<{ connectorId: string }>();
    const navigate = useNavigate();
    const isNew = connectorId === 'new';

    const [manifest, setManifest] = useState<ConnectorManifest | null | undefined>(undefined);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [autosaveState, setAutosaveState] = useState<ConnectorAutosaveState>({
        isSaving: false,
        saveError: null,
    });
    const [generalDialogOpen, setGeneralDialogOpen] = useState(false);

    const loadConnector = useCallback(async () => {
        if (isNew || !connectorId) return;

        setManifest(undefined);
        setLoadError(null);
        try {
            const connectors = scope === 'SYSTEM' ? await connectorApi.adminList() : await connectorApi.list();
            const connector = connectors.find((item) => item.connectorId === connectorId);

            if (!connector) {
                setLoadError("We couldn't find this connector.");
                setManifest(null);
                return;
            }

            setManifest(connector);
        } catch (err) {
            console.error('Failed to load connector', err);
            setLoadError("We couldn't load this connector right now.");
            setManifest(null);
        }
    }, [connectorId, isNew, scope]);

    useEffect(() => {
        if (isNew) {
            setManifest(null);
            setLoadError(null);
            setGeneralDialogOpen(true);
            return;
        }

        if (!connectorId) {
            setLoadError("We couldn't load this connector right now.");
            setManifest(null);
            return;
        }

        void loadConnector();
    }, [connectorId, isNew, loadConnector]);

    const confirmLeave = useCallback(() => {
        if (autosaveState.isSaving && !confirm('Changes are still saving. Leave anyway?')) {
            return false;
        }
        return true;
    }, [autosaveState.isSaving]);

    const handleAppsNavigate = useCallback(
        (event: { preventDefault: () => void }) => {
            if (!confirmLeave()) {
                event.preventDefault();
            }
        },
        [confirmLeave],
    );

    const handleGeneralDialogClose = useCallback(() => {
        setGeneralDialogOpen(false);
        if (isNew) {
            navigate('/apps');
        }
    }, [isNew, navigate]);

    const handleGeneralSaved = useCallback(
        (saved: ConnectorManifest) => {
            if (isNew) {
                navigate(`/apps/${saved.connectorId}`, { replace: true });
                return;
            }
            setManifest(saved);
        },
        [isNew, navigate],
    );

    const pageTitle = isNew ? 'New App' : manifest?.displayName?.trim() || 'App';
    const showWorkspace = !isNew && manifest != null && !loadError;

    if (!isNew && manifest === undefined && !loadError) {
        return (
            <div className="flex h-full flex-col bg-background">
                <PageHeader
                    title={
                        <PageBreadcrumb
                            items={[
                                { label: 'Apps', href: '/apps', onNavigate: handleAppsNavigate },
                                { label: 'Loading...' },
                            ]}
                        />
                    }
                />
                <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col bg-background">
            <PageHeader
                title={
                    <PageBreadcrumb
                        items={[
                            { label: 'Apps', href: '/apps', onNavigate: handleAppsNavigate },
                            { label: pageTitle, testId: 'connector-builder-heading' },
                        ]}
                    />
                }
            />

            <div className="flex-1 overflow-auto p-6">
                {loadError ? (
                    <ErrorBanner data-testid="connector-builder-load-error" message={loadError} />
                ) : null}

                {showWorkspace && manifest ? (
                    <>
                        {autosaveState.saveError ? (
                            <ErrorBanner
                                data-testid="connector-builder-save-error"
                                title="Failed to save"
                                message={autosaveState.saveError}
                                className="mb-6"
                            />
                        ) : null}

                        <ConnectorGeneralInfoCard
                            connector={manifest}
                            onEdit={() => setGeneralDialogOpen(true)}
                        />

                        <ConnectorBuilder
                            scope={scope}
                            manifest={manifest}
                            onManifestChange={setManifest}
                            onAutosaveStateChange={setAutosaveState}
                        />
                    </>
                ) : null}

                {isNew && !loadError ? (
                    <p className="text-sm text-muted-foreground">
                        Use the dialog to enter general information. Triggers, actions, and credentials appear after the app is created.
                    </p>
                ) : null}
            </div>

            <EditConnectorGeneralDialog
                open={generalDialogOpen}
                onClose={handleGeneralDialogClose}
                mode={isNew ? 'create' : 'edit'}
                scope={scope}
                connector={manifest ?? null}
                onSaved={handleGeneralSaved}
            />
        </div>
    );
}
