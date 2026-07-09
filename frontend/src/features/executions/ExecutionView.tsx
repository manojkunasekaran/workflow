import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Connection, Edge, NodeChange } from '@xyflow/react';
import { Loader2, RefreshCw, XCircle } from 'lucide-react';
import { ExecutionHeader } from '@/features/executions/ExecutionHeader';
import {
    loadExecutionGraph,
    type ExecutionGraphData,
} from '@/features/executions/lib/loadExecutionGraph';
import {
    WorkflowCanvas,
    useWorkflowCanvasState,
} from '@/features/workflow-studio/WorkflowCanvas';
import type { StudioCanvasNode } from '@/features/workflow-studio/lib/workflowGraph';
import {
    buildExecutionNodeStatusMap,
} from '@/features/executions/lib/executionNodeStatus';
import { TaskExecutionDialog } from '@/features/executions/TaskExecutionDialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const noop = () => {};

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

    const { nodes, edges, onNodesChange, resetCanvas } = useWorkflowCanvasState(
        [],
        [],
    );

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
        if (!data) return;
        const active = ['RUNNING', 'QUEUED', 'PAUSED'].includes(data.execution.status);
        if (!active) return;
        const timer = window.setInterval(() => void load(true), 3000);
        return () => window.clearInterval(timer);
    }, [data?.execution.status, load]);

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
        <div className="flex h-full min-h-0 flex-col bg-[#f8fafc]">
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
