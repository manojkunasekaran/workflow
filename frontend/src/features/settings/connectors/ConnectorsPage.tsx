import { useState } from 'react';
import ConnectorList from './ConnectorList';
import ConnectorBuilder from './ConnectorBuilder';
import { type ConnectorManifest } from '@/api/connectorApi';

interface ConnectorsPageProps {
    scope: 'SYSTEM' | 'TENANT';
}

/**
 * Shared page shell for both Admin (SYSTEM) and Workspace (TENANT) connector management.
 * Handles the list ↔ builder navigation state.
 */
export default function ConnectorsPage({ scope }: ConnectorsPageProps) {
    // null = show list, 'NEW' = create form, ConnectorManifest = edit form
    const [view, setView] = useState<'LIST' | 'NEW' | ConnectorManifest>('LIST');

    if (view === 'LIST') {
        return (
            <ConnectorList
                scope={scope}
                onCreate={() => setView('NEW')}
                onEdit={(connector) => setView(connector)}
            />
        );
    }

    return (
        <ConnectorBuilder
            scope={scope}
            initialData={view === 'NEW' ? null : view}
            onBack={() => setView('LIST')}
        />
    );
}
