import { useRef, useState, useCallback, useEffect } from 'react';
import { Braces, X, Search, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    buildExpression,
    buildVariableSources,
    type VariableSource,
    type VariableSchemaNode,
} from '@/features/workflow-studio/lib/variableExplorer';
import { useVariableExplorerContext } from '@/features/workflow-studio/task-config/VariableExplorerContext';

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PropertyRowProps {
    scope: string;
    propertyKey: string;
    node: VariableSchemaNode;
    onSelect: (expression: string) => void;
    depth?: number;
}

function PropertyRow({ scope, propertyKey, node, onSelect, depth = 0 }: PropertyRowProps) {
    const [expanded, setExpanded] = useState(false);
    const hasChildren = node.children && Object.keys(node.children).length > 0;
    const isWildcard = propertyKey === '*';
    const expression = isWildcard ? buildExpression(scope) : buildExpression(scope, propertyKey);

    return (
        <div>
            <button
                type="button"
                className={cn(
                    'group flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                )}
                style={{ paddingLeft: `${8 + depth * 12}px` }}
                onClick={() => {
                    if (hasChildren) {
                        setExpanded((p) => !p);
                    } else {
                        onSelect(expression);
                    }
                }}
            >
                {hasChildren && (
                    <ChevronRight
                        className={cn(
                            'h-3 w-3 shrink-0 text-muted-foreground transition-transform',
                            expanded && 'rotate-90',
                        )}
                    />
                )}
                {!hasChildren && <span className="h-3 w-3 shrink-0" />}

                <span className="font-mono text-[11px] text-foreground">
                    {isWildcard ? '(any property)' : propertyKey}
                </span>
                <span className="ml-auto shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground">
                    {node.type}
                </span>
                {!hasChildren && (
                    <span className="hidden text-[10px] text-primary group-hover:block">
                        insert ↵
                    </span>
                )}
                {hasChildren && (
                    <button
                        type="button"
                        className="hidden shrink-0 text-[10px] text-primary group-hover:block"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(expression);
                        }}
                    >
                        insert ↵
                    </button>
                )}
            </button>
            {hasChildren && expanded && node.children && (
                <div>
                    {Object.entries(node.children).map(([key, child]) => (
                        <PropertyRow
                            key={key}
                            scope={`${scope}.${propertyKey}`}
                            propertyKey={key}
                            node={child}
                            onSelect={onSelect}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface SourceSectionProps {
    source: VariableSource;
    search: string;
    onSelect: (expression: string) => void;
}

function SourceSection({ source, search, onSelect }: SourceSectionProps) {
    const [expanded, setExpanded] = useState(true);
    const lower = search.toLowerCase();

    const filteredEntries = Object.entries(source.schema).filter(([key, node]) => {
        if (!search) return true;
        return (
            key.toLowerCase().includes(lower) ||
            (node.label ?? '').toLowerCase().includes(lower) ||
            source.label.toLowerCase().includes(lower) ||
            source.scope.toLowerCase().includes(lower)
        );
    });

    if (filteredEntries.length === 0) return null;

    return (
        <div className="border-b border-border/50 last:border-0">
            <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left"
                onClick={() => setExpanded((p) => !p)}
            >
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                        {source.isGlobal && (
                            <span className="rounded bg-violet-100 px-1 py-0.5 font-mono text-[9px] font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                                global
                            </span>
                        )}
                        <span className="truncate text-xs font-semibold text-foreground">
                            {source.label}
                        </span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">{source.scope}</span>
                </div>
                <ChevronRight
                    className={cn(
                        'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
                        expanded && 'rotate-90',
                    )}
                />
            </button>

            {expanded && (
                <div className="pb-1">
                    {filteredEntries.map(([key, node]) => (
                        <PropertyRow
                            key={key}
                            scope={source.scope}
                            propertyKey={key}
                            node={node}
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main DataExplorer ────────────────────────────────────────────────────────

export interface DataExplorerProps {
    currentNodeId: string;
    onSelect: (expression: string) => void;
    onClose?: () => void;
    className?: string;
}

export function DataExplorer({
    currentNodeId,
    onSelect,
    onClose,
    className,
}: DataExplorerProps) {
    const { nodes, edges, workflowInputs, workflowVariables } = useVariableExplorerContext();
    const [search, setSearch] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Auto-focus search when the explorer mounts
        requestAnimationFrame(() => searchRef.current?.focus());
    }, []);

    const sources = buildVariableSources(currentNodeId, nodes, edges, workflowInputs, workflowVariables);

    const handleSelect = useCallback(
        (expression: string) => {
            onSelect(expression);
        },
        [onSelect],
    );

    return (
        <div
            data-testid="data-explorer"
            className={cn(
                'flex flex-col rounded-lg border border-border bg-popover shadow-xl',
                'w-72 overflow-hidden',
                className,
            )}
        >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                <Braces className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="text-xs font-semibold text-foreground">Variables</span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                    {sources.length} sources
                </span>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="ml-1 rounded p-0.5 text-muted-foreground hover:text-foreground"
                        aria-label="Close variable picker"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="border-b border-border px-2 py-2">
                <div className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5">
                    <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <input
                        ref={searchRef}
                        data-testid="data-explorer-search"
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search variables…"
                        className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                    />
                </div>
            </div>

            {/* Sources */}
            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
                {sources.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                        No variables available yet. Add tasks before this one to use their output.
                    </p>
                ) : (
                    sources.map((source) => (
                        <SourceSection
                            key={source.scope}
                            source={source}
                            search={search}
                            onSelect={handleSelect}
                        />
                    ))
                )}
            </div>

            {/* Footer hint */}
            <div className="border-t border-border px-3 py-2">
                <p className="text-[10px] text-muted-foreground">
                    Click a variable to insert into the expression
                </p>
            </div>
        </div>
    );
}
