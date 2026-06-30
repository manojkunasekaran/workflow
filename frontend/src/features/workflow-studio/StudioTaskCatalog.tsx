import { ChevronRight, X } from 'lucide-react';
import { TASK_PALETTE, type StudioTaskType } from '@/features/workflow-studio/constants/taskPalette';
import { cn } from '@/lib/utils';

interface StudioTaskCatalogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectType: (type: StudioTaskType) => void;
    disabled?: boolean;
    /** When set, only these task types are shown (e.g. Join-only from BRANCH Join handle). */
    allowedTypes?: StudioTaskType[];
}

export function StudioTaskCatalog({
    open,
    onOpenChange,
    onSelectType,
    disabled,
    allowedTypes,
}: StudioTaskCatalogProps) {
    const catalogItems = allowedTypes
        ? TASK_PALETTE.filter((item) => allowedTypes.includes(item.type))
        : TASK_PALETTE;
    return (
        <div
            className={cn(
                'flex shrink-0 flex-col border-l border-[#c6c6cd] bg-white transition-[width] duration-200',
                open ? 'w-60' : 'w-10',
                disabled && 'pointer-events-none opacity-50',
            )}
        >
            {open ? (
                <>
                    <div className="flex items-center justify-between border-b border-[#c6c6cd]/60 px-3 py-2.5">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[#45464d]">
                            Add task
                        </p>
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-[#45464d] hover:bg-[#eff4ff] hover:text-[#0b1c30]"
                            aria-label="Close task catalog"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <ul className="flex-1 overflow-y-auto p-2 scrollbar-thin" data-testid="task-catalog-list">
                        {catalogItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <li key={item.type}>
                                    <button
                                        type="button"
                                        data-testid={`catalog-item-${item.type}`}
                                        onClick={() => onSelectType(item.type)}
                                        className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-xs text-[#0b1c30] transition-colors hover:bg-[#eff4ff]"
                                    >
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#2170e4]/10 text-[#0058be]">
                                            <Icon className="h-3.5 w-3.5" />
                                        </span>
                                        <span className="font-medium">{item.label}</span>
                                    </button>
                                </li>
                            );
                        })}
                        {catalogItems.length === 0 && (
                            <li className="px-2 py-3 text-[11px] text-muted-foreground">
                                No matching task types for this connection.
                            </li>
                        )}
                    </ul>
                </>
            ) : (
                <button
                    type="button"
                    onClick={() => !disabled && onOpenChange(true)}
                    className="flex h-full min-h-[120px] flex-col items-center justify-center gap-1 px-1 py-4 text-[#45464d] hover:bg-[#f8f9ff] hover:text-[#0058be]"
                    aria-label="Open task catalog"
                    title="Task catalog"
                >
                    <ChevronRight className="h-4 w-4 rotate-180" />
                    <span
                        className="text-[10px] font-bold uppercase tracking-wide [writing-mode:vertical-rl]"
                        style={{ writingMode: 'vertical-rl' }}
                    >
                        Tasks
                    </span>
                </button>
            )}
        </div>
    );
}
