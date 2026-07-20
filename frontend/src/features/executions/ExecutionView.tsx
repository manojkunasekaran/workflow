import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Connection, Edge, NodeChange } from '@xyflow/react';
import { Loader2, RefreshCw, XCircle } from 'lucide-react';
import { ExecutionHeader } from '@/features/executions/ExecutionHeader';
import {
    loadExecutionGraph,
    type ExecutionGraphData,
} from '@/features/executions/lib/loadExecutionGraph';
import { useNodesState, useEdgesState } from '@xyflow/react';
import { WorkflowCanvas } from '@/features/workflow-studio/WorkflowCanvas';
import type { StudioCanvasNode } from '@/features/workflow-studio/lib/workflowGraph';
import {
    buildExecutionNodeStatusMap,
} from '@/features/executions/lib/executionNodeStatus';
import { TaskExecutionDialog } from '@/features/executions/TaskExecutionDialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { executionStreamUrl } from '@/api/executionApi';

const noop = () => {};

const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED']);

interface ExecutionViewProps {
    executionId: string;
    embedded?: boolean;
    showHeader?: boolean;
    onBack?: () => void;
}

export function ExecutionView({
    executionId,
    embedded = false,
    showHeader = true,
    onBack,
}: ExecutionViewProps) {
    const [data, setData] = useState<ExecutionGraphData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const reconnectAttemptRef = useRef(0);

    const [nodes, setNodes, onNodesChange] = useNodesState<StudioCanvasNode>([]);
    const [edges, setEdges] = useEdgesState<Edge>([]);

    const resetCanvas = useCallback((nextNodes: StudioCanvasNode[], nextEdges: Edge[]) => {
        setNodes(nextNodes);
        setEdges(nextEdges);
    }, [setNodes, setEdges]);

    const load = useCallback(
        async (refresh = false) => {
            if (!executionId) return;
            try {
                if (refresh) setIsRefreshing(true);
                else setIsLoading(true);
                setError(null);
                const graph = await loadExecutionGraph(executionId);
                setData(graph);
                resetCanvas(graph.nodes, graph.edges);
            } catch (err) {
                console.error('Failed to load execution graph', err);
                setError('Failed to load execution details');
                setData(null);
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [executionId, resetCanvas],
    );

    useEffect(() => {
        void load(false);
    }, [load]);

    useEffect(() => {
        if (!executionId) return;

        let source: EventSource | null = null;
        let reconnectTimer: number | null = null;
        let closed = false;

        const connect = () => {
            source = new EventSource(executionStreamUrl(executionId));

            source.addEventListener('execution', (event) => {
                try {
                    const payload = JSON.parse((event as MessageEvent<string>).data) as {
                        status?: string;
                    };
                    if (!payload.status) return;

                    setData((prev) => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            execution: { ...prev.execution, status: payload.status! },
                        };
                    });

                    if (TERMINAL_STATUSES.has(payload.status) || payload.status === 'PAUSED') {
                        void load(true);
                    }
                } catch (err) {
                    console.warn('Failed to parse execution SSE event', err);
                }
            });

            source.onerror = () => {
                source?.close();
                if (closed) return;
                const delay = Math.min(30_000, 1000 * 2 ** reconnectAttemptRef.current);
                reconnectAttemptRef.current += 1;
                reconnectTimer = window.setTimeout(() => {
                    void load(true).finally(connect);
                }, delay);
            };

            source.onopen = () => {
                reconnectAttemptRef.current = 0;
            };
        };

        connect();

        return () => {
            closed = true;
            source?.close();
            if (reconnectTimer) window.clearTimeout(reconnectTimer);
        };
    }, [executionId, load]);

    useEffect(() => {
        setSelectedTaskId(null);
        setDialogOpen(false);
    }, [executionId]);

    const executionNodeStatuses = useMemo(() => {
        if (!data) return undefined;
        const taskIds = data.definition.tasks.map((task) => task.taskId);
        return buildExecutionNodeStatusMap(data.taskExecutions, taskIds);
    }, [data]);

    const handleNodesChange = useCallback(
        (changes: NodeChange<StudioCanvasNode>[]) => {
            onNodesChange(changes);
        },
        [onNodesChange],
    );

    if (isLoading) {
        return (
            <div className="flex h-full flex-col bg-background">
                <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex h-full flex-col bg-background">
                <div className="flex flex-1 flex-col items-center justify-center gap-4">
                    <XCircle className="h-12 w-12 text-red-500" />
                    <p className="text-muted-foreground">{error ?? 'Execution not found'}</p>
                    {onBack ? (
                        <Button variant="outline" onClick={onBack}>
                            Back
                        </Button>
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col bg-background">
            {showHeader ? (
                <ExecutionHeader
                    execution={data.execution}
                    definition={data.definition}
                    onRefresh={() => void load(true)}
                    isRefreshing={isRefreshing}
                    onBack={onBack}
                    embedded={embedded}
                />
            ) : (
                <div className="flex items-center justify-end gap-2 border-b border-border bg-background px-4 py-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void load(true)}
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                        Refresh
                    </Button>
                </div>
            )}

            <div className="relative min-h-0 min-w-0 flex-1">
                <WorkflowCanvas
                    key={executionId}
                    nodes={nodes}
                    chainEdges={edges}
                    mode="inspect"
                    enableTaskSelection
                    executionNodeStatuses={executionNodeStatuses}
                    onNodesChange={handleNodesChange}
                    onChainEdgesChange={noop}
                    onGraphConnect={noop as (c: Connection) => void}
                    onRouteEdgeRemove={noop as (e: Edge) => void}
                    onAddTaskClick={noop}
                    onBranchAddClick={noop}
                    onEdgeInsert={noop as (e: Edge) => void}
                    onEdgeDelete={noop as (e: Edge) => void}
                    onTaskSelect={(id) => {
                        if (!id) {
                            setSelectedTaskId(null);
                            setDialogOpen(false);
                            return;
                        }
                        setSelectedTaskId(id);
                        setDialogOpen(true);
                    }}
                    onTaskDelete={noop}
                    onTidyUp={noop}
                />

                <TaskExecutionDialog
                    open={dialogOpen}
                    taskId={selectedTaskId}
                    definition={data.definition}
                    execution={data.execution}
                    taskExecutions={data.taskExecutions}
                    onOpenChange={setDialogOpen}
                    onRefresh={() => void load(true)}
                />
            </div>
        </div>
    );
}
