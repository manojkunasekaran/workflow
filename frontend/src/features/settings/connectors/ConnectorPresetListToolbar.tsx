import type { ReactNode } from 'react';
import { ViewToggle } from '@/components/ui/view-toggle';

export type ConnectorPresetViewMode = 'list' | 'grid';

interface ConnectorPresetListToolbarProps {
    title: string;
    description: string;
    count: number;
    viewMode: ConnectorPresetViewMode;
    onViewModeChange: (mode: ConnectorPresetViewMode) => void;
    actions?: ReactNode;
    showViewToggle?: boolean;
}

/** Shared header row for trigger/action lists (matches integrations/credentials app tabs). */
export function ConnectorPresetListToolbar({
    title,
    description,
    count,
    viewMode,
    onViewModeChange,
    actions,
    showViewToggle = true,
}: ConnectorPresetListToolbarProps) {
    return (
        <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
                <h3 className="text-sm font-medium">
                    {title} ({count})
                </h3>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
                {actions}
                {showViewToggle ? <ViewToggle value={viewMode} onChange={onViewModeChange} /> : null}
            </div>
        </div>
    );
}

export function connectorPresetListClassName(viewMode: ConnectorPresetViewMode): string {
    return viewMode === 'grid'
        ? 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'
        : 'grid gap-2';
}
