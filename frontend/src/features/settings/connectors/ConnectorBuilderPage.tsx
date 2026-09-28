import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Save } from 'lucide-react';
import ConnectorBuilder, { type ConnectorBuilderHandle, type ConnectorBuilderHeaderState } from './ConnectorBuilder';
import { connectorApi, type ConnectorManifest } from '@/api/connectorApi';
import { PageHeader } from '@/layouts/PageHeader';
import { PageBreadcrumb } from '@/layouts/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';

interface ConnectorBuilderPageProps {
    scope: 'SYSTEM' | 'TENANT';
}

const DEFAULT_HEADER_STATE: ConnectorBuilderHeaderState = {
    isSaving: false,
    isDirty: false,
    saveStatus: 'idle',
    saveError: null,
    title: 'New Connector',
};

export default function ConnectorBuilderPage({ scope }: ConnectorBuilderPageProps) {
    const { connectorId } = useParams<{ connectorId: string }>();
    const navigate = useNavigate();
    const builderRef = useRef<ConnectorBuilderHandle>(null);
    const isNew = connectorId === 'new';

    const [initialData, setInitialData] = useState<ConnectorManifest | null | undefined>(undefined);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [headerState, setHeaderState] = useState<ConnectorBuilderHeaderState>(DEFAULT_HEADER_STATE);

    useEffect(() => {
        if (isNew) {
            setInitialData(null);
            setLoadError(null);
            setHeaderState(DEFAULT_HEADER_STATE);
            return;
        }

        if (!connectorId) {
            setLoadError("We couldn't load this connector right now.");
            setInitialData(null);
            return;
        }

        let cancelled = false;

        const loadConnector = async () => {
            setInitialData(undefined);
            setLoadError(null);
            try {
                const connectors = scope === 'SYSTEM'
                    ? await connectorApi.adminList()
                    : await connectorApi.list();
                const connector = connectors.find((item) => item.connectorId === connectorId);
                if (cancelled) return;

                if (!connector) {
                    setLoadError("We couldn't find this connector.");
                    setInitialData(null);
                    return;
                }

                setInitialData(connector);
                setHeaderState((prev) => ({
                    ...prev,
                    title: connector.displayName,
                }));
            } catch (err) {
                console.error('Failed to load connector', err);
                if (!cancelled) {
                    setLoadError("We couldn't load this connector right now.");
                    setInitialData(null);
                }
            }
        };

        void loadConnector();

        return () => {
            cancelled = true;
        };
    }, [connectorId, isNew, scope]);

    const confirmLeave = useCallback(() => {
        if (!headerState.isDirty) return true;
        return confirm('You have unsaved changes. Leave without saving?');
    }, [headerState.isDirty]);

    const handleAppsNavigate = useCallback((event: { preventDefault: () => void }) => {
        if (!confirmLeave()) {
            event.preventDefault();
        }
    }, [confirmLeave]);

    const handleSaved = useCallback(() => {
        navigate('/apps');
    }, [navigate]);

    const pageTitle = isNew ? 'New Connector' : headerState.title;

    if (!isNew && initialData === undefined && !loadError) {
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
                actions={
                    <>
                        {headerState.saveStatus === 'success' ? (
                            <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-4 w-4" aria-hidden />
                                Saved
                            </span>
                        ) : null}
                        <Button
                            data-testid="save-connector-btn-header"
                            size="sm"
                            onClick={() => builderRef.current?.save()}
                            disabled={headerState.isSaving || (!isNew && !!loadError)}
                            className="min-w-[100px] gap-2"
                        >
                            {headerState.isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" aria-hidden />
                                    Save
                                </>
                            )}
                        </Button>
                    </>
                }
            />

            <div className="flex-1 overflow-auto p-6">
                {loadError ? (
                    <ErrorBanner data-testid="connector-builder-load-error" message={loadError} />
                ) : null}

                {headerState.saveStatus === 'error' && headerState.saveError ? (
                    <ErrorBanner
                        data-testid="connector-builder-save-error"
                        title="Failed to save connector"
                        message={headerState.saveError}
                        className="mb-6"
                    />
                ) : null}

                {!loadError ? (
                    <ConnectorBuilder
                        ref={builderRef}
                        scope={scope}
                        initialData={isNew ? null : initialData}
                        onSaved={handleSaved}
                        onHeaderStateChange={setHeaderState}
                    />
                ) : null}
            </div>
        </div>
    );
}
