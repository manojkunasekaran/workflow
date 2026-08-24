import { ChevronRight, GripVertical, Search, X } from 'lucide-react';
import { Hint } from '@/components/ui/hint';
import { STUDIO_TASK_DRAG_MIME } from '@/features/workflow-studio/constants/studioDrag';
import { TASK_PALETTE, type StudioTaskType } from '@/features/workflow-studio/constants/taskPalette';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { connectorApi, type ConnectorManifest } from '@/api/connectorApi';

interface StudioTaskCatalogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Opens catalog from sidebar tab — browse/drag only, not wired add-from-+. */
    onBrowseOpen?: () => void;
    /** When set (e.g. after + on handle), click adds wired task and opens config. */
    onSelectType?: (type: StudioTaskType) => void;
    disabled?: boolean;
    /** When set, only these task types are shown (e.g. Join-only from BRANCH Join handle). */
    allowedTypes?: StudioTaskType[];
}

export function StudioTaskCatalog({
    open,
    onOpenChange,
    onBrowseOpen,
    onSelectType,
    disabled,
    allowedTypes,
}: StudioTaskCatalogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [connectors, setConnectors] = useState<ConnectorManifest[]>([]);

    useEffect(() => {
        connectorApi.list().then(setConnectors).catch(console.error);
    }, []);
    
    const catalogItems = (allowedTypes
        ? TASK_PALETTE.filter((item) => allowedTypes.includes(item.type) && item.type !== 'CONNECTOR_TASK')
        : TASK_PALETTE.filter(item => item.type !== 'CONNECTOR_TASK')).filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()));
        
    const integrationItems = connectors.filter(item => item.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const clickToAdd = Boolean(onSelectType);

    return (
        <div
            className={cn(
                'flex shrink-0 flex-col border-l border-border bg-card transition-[width] duration-200',
                open ? 'w-60' : 'w-10',
                disabled && 'pointer-events-none opacity-50',
            )}
        >
            {open ? (
                <>
                    <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-foreground">
                            Tasks
                        </p>
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            aria-label="Close task catalog"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="border-b border-border/60 p-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-md border border-input bg-background py-1.5 pl-7 pr-2 text-xs shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                data-testid="task-catalog-search"
                            />
                        </div>
                    </div>
                    <ul className="flex-1 overflow-y-auto p-2" style={{ maxHeight: 'calc(100vh - 160px)' }} data-testid="task-catalog-list">
                        {catalogItems.length > 0 && (
                            <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Built-in
                            </div>
                        )}
                        {catalogItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <li key={item.type}>
                                    <div
                                        role="button"
                                        tabIndex={disabled ? -1 : 0}
                                        draggable={!disabled}
                                        data-testid={`catalog-item-${item.type}`}
                                        onDragStart={(event) => {
                                            if (disabled) {
                                                event.preventDefault();
                                                return;
                                            }
                                            event.dataTransfer.setData(STUDIO_TASK_DRAG_MIME, item.type);
                                            event.dataTransfer.effectAllowed = 'copy';
                                        }}
                                        onClick={() => {
                                            if (!disabled && clickToAdd) {
                                                onSelectType?.(item.type);
                                            }
                                        }}
                                        onKeyDown={(event) => {
                                            if (
                                                !disabled &&
                                                clickToAdd &&
                                                (event.key === 'Enter' || event.key === ' ')
                                            ) {
                                                event.preventDefault();
                                                onSelectType?.(item.type);
                                            }
                                        }}
                                        className={cn(
                                            'group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-foreground transition-colors',
                                            clickToAdd ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
                                            'hover:bg-accent hover:text-accent-foreground',
                                            disabled && 'cursor-not-allowed',
                                        )}
                                    >
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                            <Icon className="h-3.5 w-3.5" />
                                        </span>
                                        <span className="min-w-0 flex-1 font-medium">{item.label}</span>
                                        <GripVertical
                                            className="h-4 w-0 shrink-0 overflow-hidden text-muted-foreground opacity-0 transition-[width,opacity] duration-150 group-hover:w-4 group-hover:opacity-100"
                                            aria-hidden
                                        />
                                    </div>
                                </li>
                            );
                        })}
                        {integrationItems.length > 0 && (!allowedTypes || allowedTypes.includes('CONNECTOR_TASK')) && (
                            <>
                                <div className="px-2 py-1.5 mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Integrations
                                </div>
                                {integrationItems.map((item) => {

                                                // Resolve icon: CDN/http URLs used directly; others treated as local
                                                const iconSrc = item.icon?.startsWith('http')
                                                    ? item.icon
                                                    : item.icon
                                                        ? `/connectors/${item.icon}`
                                                        : undefined;

                                                // Derive initials fallback
                                                const initials = item.displayName
                                                    .split(' ')
                                                    .slice(0, 2)
                                                    .map((w: string) => w[0])
                                                    .join('')
                                                    .toUpperCase();

                                                return (
                                                    <li key={`connector-${item.connectorId}`}>
                                                        <div
                                                            role="button"
                                                            tabIndex={disabled ? -1 : 0}
                                                            draggable={!disabled}
                                                            data-testid={`catalog-item-connector-${item.connectorId}`}
                                                            onDragStart={(event) => {
                                                                if (disabled) {
                                                                    event.preventDefault();
                                                                    return;
                                                                }
                                                                // Include iconUrl and connectorName in payload so the canvas node gets clean naming & brand icon
                                                                const dragPayload = JSON.stringify({
                                                                    type: 'CONNECTOR_TASK',
                                                                    connectorId: item.connectorId,
                                                                    connectorName: item.displayName,
                                                                    connectorIcon: iconSrc ?? '',
                                                                });
                                                                event.dataTransfer.setData(STUDIO_TASK_DRAG_MIME, dragPayload);
                                                                event.dataTransfer.effectAllowed = 'copy';
                                                            }}
                                                            onClick={() => {
                                                                if (!disabled && clickToAdd) {
                                                                    const clickPayload = JSON.stringify({
                                                                        type: 'CONNECTOR_TASK',
                                                                        connectorId: item.connectorId,
                                                                        connectorName: item.displayName,
                                                                        connectorIcon: iconSrc ?? '',
                                                                    });
                                                                    onSelectType?.(clickPayload as StudioTaskType);
                                                                }
                                                            }}
                                                            onKeyDown={(event) => {
                                                                if (
                                                                    !disabled &&
                                                                    clickToAdd &&
                                                                    (event.key === 'Enter' || event.key === ' ')
                                                                ) {
                                                                    event.preventDefault();
                                                                    const keyPayload = JSON.stringify({
                                                                        type: 'CONNECTOR_TASK',
                                                                        connectorId: item.connectorId,
                                                                        connectorName: item.displayName,
                                                                        connectorIcon: iconSrc ?? '',
                                                                    });
                                                                    onSelectType?.(keyPayload as StudioTaskType);
                                                                }
                                                            }}
                                                            className={cn(
                                                                'group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-foreground transition-colors',
                                                                clickToAdd ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
                                                                'hover:bg-accent hover:text-accent-foreground',
                                                                disabled && 'cursor-not-allowed',
                                                            )}
                                                        >
                                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted overflow-hidden">
                                                                {iconSrc ? (
                                                                    <img
                                                                        src={iconSrc}
                                                                        alt={item.displayName}
                                                                        className="h-5 w-5 object-contain"
                                                                        onError={e => {
                                                                            e.currentTarget.style.display = 'none';
                                                                            e.currentTarget.parentElement!.textContent = initials;
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <span className="text-[10px] font-bold text-muted-foreground">{initials}</span>
                                                                )}
                                                            </span>
                                                            <span className="min-w-0 flex-1 font-medium">{item.displayName}</span>
                                                            <GripVertical
                                                                className="h-4 w-0 shrink-0 overflow-hidden text-muted-foreground opacity-0 transition-[width,opacity] duration-150 group-hover:w-4 group-hover:opacity-100"
                                                                aria-hidden
                                                            />
                                                        </div>
                                                    </li>
                                                );
                                })}
                            </>
                        )}
                        {catalogItems.length === 0 && integrationItems.length === 0 && (
                            <li className="px-2 py-3 text-[11px] text-muted-foreground">
                                No matching task types for this connection.
                            </li>
                        )}
                    </ul>
                </>
            ) : (
                <Hint content="Task catalog" side="left">
                    <button
                        type="button"
                        onClick={() => {
                            if (disabled) return;
                            onBrowseOpen?.();
                            onOpenChange(true);
                        }}
                        className="flex h-full min-h-[120px] flex-col items-center justify-center gap-1 px-1 py-4 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        aria-label="Open task catalog"
                    >
                        <ChevronRight className="h-4 w-4 rotate-180" />
                        <span
                            className="text-[10px] font-bold uppercase tracking-wide [writing-mode:vertical-rl]"
                            style={{ writingMode: 'vertical-rl' }}
                        >
                            Tasks
                        </span>
                    </button>
                </Hint>
            )}
        </div>
    );
}
