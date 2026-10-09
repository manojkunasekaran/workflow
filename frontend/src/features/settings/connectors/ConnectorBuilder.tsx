import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConnectorManifest } from '@/api/connectorApi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ActionBuilder from './ActionBuilder';
import TriggerBuilder from './TriggerBuilder';
import { CredentialsList } from '@/features/settings/components/CredentialsList';
import { IntegrationList } from '@/features/integrations/components/IntegrationList';
import { persistConnectorManifest } from './connectorManifestSave';

export interface ConnectorAutosaveState {
    isSaving: boolean;
    saveError: string | null;
}

interface ConnectorBuilderProps {
    scope: 'SYSTEM' | 'TENANT';
    manifest: ConnectorManifest;
    onManifestChange: (manifest: ConnectorManifest) => void;
    onAutosaveStateChange?: (state: ConnectorAutosaveState) => void;
}

const AUTOSAVE_DEBOUNCE_MS = 400;

export default function ConnectorBuilder({
    scope,
    manifest,
    onManifestChange,
    onAutosaveStateChange,
}: ConnectorBuilderProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingManifestRef = useRef<ConnectorManifest | null>(null);
    const saveInFlightRef = useRef(false);

    const defaultTab = window.location.hash.replace('#', '') || 'triggers';
    const [activeTab, setActiveTab] = useState(defaultTab);

    useEffect(() => {
        const handleHashChange = () => {
            const newHash = window.location.hash.replace('#', '');
            if (['triggers', 'actions', 'credentials', 'integrations'].includes(newHash)) {
                setActiveTab(newHash);
            }
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    useEffect(() => {
        onAutosaveStateChange?.({ isSaving, saveError });
    }, [isSaving, saveError, onAutosaveStateChange]);

    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    const runPersist = useCallback(
        async (manifestToSave: ConnectorManifest) => {
            saveInFlightRef.current = true;
            setIsSaving(true);
            setSaveError(null);
            try {
                const saved = await persistConnectorManifest(manifestToSave, scope);
                onManifestChange(saved);
                pendingManifestRef.current = null;
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Could not save changes. Try again.';
                setSaveError(message);
            } finally {
                saveInFlightRef.current = false;
                setIsSaving(false);

                const queued = pendingManifestRef.current;
                if (queued) {
                    pendingManifestRef.current = null;
                    void runPersist(queued);
                }
            }
        },
        [onManifestChange, scope],
    );

    const scheduleAutosave = useCallback(
        (nextManifest: ConnectorManifest) => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
            debounceRef.current = setTimeout(() => {
                debounceRef.current = null;
                if (saveInFlightRef.current) {
                    pendingManifestRef.current = nextManifest;
                    return;
                }
                void runPersist(nextManifest);
            }, AUTOSAVE_DEBOUNCE_MS);
        },
        [runPersist],
    );

    const handleTabChange = (val: string) => {
        setActiveTab(val);
        window.history.replaceState(null, '', `#${val}`);
    };

    const handleTriggersOrActionsChange = <K extends 'triggers' | 'actions'>(
        field: K,
        value: ConnectorManifest[K],
    ) => {
        const next = { ...manifest, [field]: value };
        onManifestChange(next);
        scheduleAutosave(next);
    };

    const connectorId = manifest.connectorId;

    return (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="mb-4">
                <TabsTrigger value="triggers" data-testid="connector-tab-triggers">
                    Triggers ({manifest.triggers?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="actions" data-testid="connector-tab-actions">
                    Actions ({manifest.actions?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="credentials" data-testid="connector-tab-credentials">
                    Credentials
                </TabsTrigger>
                <TabsTrigger value="integrations" data-testid="connector-tab-integrations">
                    Integrations
                </TabsTrigger>
            </TabsList>

            <TabsContent value="triggers">
                <TriggerBuilder
                    triggers={manifest.triggers ?? []}
                    onChange={(triggers) => handleTriggersOrActionsChange('triggers', triggers)}
                />
            </TabsContent>

            <TabsContent value="actions">
                <ActionBuilder
                    actions={manifest.actions ?? []}
                    onChange={(actions) => handleTriggersOrActionsChange('actions', actions)}
                />
            </TabsContent>

            <TabsContent value="credentials">
                <CredentialsList connectorId={connectorId} hideFilters />
            </TabsContent>

            <TabsContent value="integrations">
                <IntegrationList connectorId={connectorId} hideFilters />
            </TabsContent>
        </Tabs>
    );
}
