import { useState } from 'react';
import {
    FlaskConical,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
    ChevronDown,
    ChevronRight,
    AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { type ConnectorTestResult } from '@/api/connectorApi';
import { workflowApi } from '@/api/workflowApi';
import { useWorkflowStore } from '@/features/workflow-studio/store/workflowStore';

// ─── JSON Tree Viewer ─────────────────────────────────────────────────────────

function JsonNode({ data, depth = 0 }: { data: unknown; depth?: number }) {
    const [expanded, setExpanded] = useState(depth < 2);
    const indent = depth * 16;

    if (data === null || data === undefined) {
        return <span className="text-muted-foreground">null</span>;
    }
    if (typeof data === 'boolean') {
        return <span className={data ? 'text-green-500' : 'text-red-500'}>{String(data)}</span>;
    }
    if (typeof data === 'number') {
        return <span className="text-blue-500">{data}</span>;
    }
    if (typeof data === 'string') {
        return <span className="text-amber-600 dark:text-amber-400">"{data}"</span>;
    }
    if (Array.isArray(data)) {
        return (
            <span>
                <button onClick={() => setExpanded(e => !e)} className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground">
                    {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <span className="font-mono text-xs">[{data.length}]</span>
                </button>
                {expanded && (
                    <div style={{ paddingLeft: indent + 16 }} className="border-l border-border/40 ml-2 mt-0.5">
                        {data.map((item, i) => (
                            <div key={i} className="py-0.5">
                                <span className="text-muted-foreground text-xs mr-2">{i}:</span>
                                <JsonNode data={item} depth={depth + 1} />
                            </div>
                        ))}
                    </div>
                )}
            </span>
        );
    }
    if (typeof data === 'object') {
        const entries = Object.entries(data as Record<string, unknown>);
        return (
            <span>
                <button onClick={() => setExpanded(e => !e)} className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground">
                    {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <span className="font-mono text-xs">{'{'}…{'}'}</span>
                </button>
                {expanded && (
                    <div style={{ paddingLeft: indent + 16 }} className="border-l border-border/40 ml-2 mt-0.5">
                        {entries.map(([k, v]) => (
                            <div key={k} className="py-0.5">
                                <span className="text-primary/80 font-medium text-xs mr-1">{k}:</span>
                                <JsonNode data={v} depth={depth + 1} />
                            </div>
                        ))}
                    </div>
                )}
            </span>
        );
    }
    return <span className="font-mono text-xs">{String(data)}</span>;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskTestPanelProps {
    parameters: Record<string, unknown>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskTestPanel({ parameters }: TaskTestPanelProps) {
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<ConnectorTestResult | null>(null);

    const targetTaskId = (parameters.__taskId as string) || (parameters.taskId as string);
    const canRun = !!targetTaskId;

    const handleTest = async () => {
        if (!canRun) return;

        setIsRunning(true);
        setResult(null);
        try {
            // Get current unsaved canvas state
            const { nodes, edges } = useWorkflowStore.getState();
            
            // Reconstruct the full draft workflow definition from the canvas
            // We need a dummy empty definition as a base, or we can build one minimally
            const { flowToDefinition } = await import('@/features/workflow-studio/lib/workflowGraph');
            
            // We need to somehow get the current definition base (e.g. name, triggers)
            // But for testing a node, the backend only needs the tasks list.
            const draftDefinition = flowToDefinition(
                'Test Draft',
                nodes,
                edges,
                { id: 'draft-test', name: 'Test Draft', tasks: [], layout: {} } as any
            );

            const cachedSampleData: Record<string, unknown> = {};
            nodes.forEach(n => {
                const nodeData = n.data as any;
                if (nodeData?.sampleData) {
                    cachedSampleData[n.id] = nodeData.sampleData;
                }
            });

            // If it's a new task (not in the graph yet), we must append it so the engine finds it
            const isNewTask = !!parameters.__isNewTask;
            if (isNewTask) {
                draftDefinition.tasks.push({
                    taskId: targetTaskId,
                    type: (parameters.__taskType as any) || 'HTTP_TASK',
                    parameters: parameters
                });
            }

            const res = await workflowApi.testNode(targetTaskId, draftDefinition, cachedSampleData);
            
            if (!res.success) {
                const isTargetFail = res.failedTaskId === targetTaskId;
                const prefix = isTargetFail 
                    ? "Target task failed" 
                    : `Upstream task '${res.failedTaskId || 'unknown'}' failed`;
                
                setResult({
                    success: false,
                    statusCode: 0,
                    durationMs: 0,
                    error: `${prefix}: ${res.error || 'Unknown error'}`
                } as any);
                return;
            }

            setResult({
                success: true,
                statusCode: 200, // Mocked since we're using real execution now
                durationMs: 0,
                response: res.targetResult
            } as any);

            if (res.newSampleData) {
                Object.entries(res.newSampleData).forEach(([tid, data]) => {
                    useWorkflowStore.getState().updateTaskSampleData(tid, data as Record<string, unknown>);
                });
            }

        } catch (err: any) {
            const message = err?.response?.data?.message || err instanceof Error ? err.message : 'Unknown error';
            setResult({ success: false, statusCode: 0, durationMs: 0, error: message });
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <Dialog onOpenChange={(open) => { if (!open) setResult(null); }}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    disabled={!canRun}
                >
                    <FlaskConical className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Test</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-5">
                <DialogHeader className="shrink-0 mb-4">
                    <DialogTitle className="flex items-center gap-2">
                        <FlaskConical className="h-5 w-5" />
                        Test Action
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
                    <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>
                            <strong>DISCLAIMER:</strong> This will perform a <strong>live workflow execution</strong> up to this node.
                            Any missing upstream tasks will be automatically executed to generate context. Real API side-effects will occur.
                        </span>
                    </div>

                    <Button
                        variant="default"
                        className="w-full gap-2"
                        onClick={handleTest}
                        disabled={!canRun || isRunning}
                    >
                        {isRunning ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <FlaskConical className="h-4 w-4" />
                        )}
                        {isRunning ? 'Running…' : 'Run Test (Real API Call)'}
                    </Button>

                    {result && (
                        <div className="space-y-3 mt-4 border-t pt-4">
                            {/* Status row */}
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1.5 font-medium">
                                    {result.success ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <XCircle className="h-4 w-4 text-destructive" />
                                    )}
                                    {result.success ? 'Success' : 'Failed'}
                                    {result.statusCode > 0 && (
                                        <span className="text-muted-foreground font-normal">· HTTP {result.statusCode}</span>
                                    )}
                                </span>
                                <span className="flex items-center gap-1 text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5" />
                                    {result.durationMs}ms
                                </span>
                            </div>

                            {/* Error message */}
                            {result.error && (
                                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3 font-mono break-all">
                                    {result.error}
                                </p>
                            )}

                            {/* Response tree */}
                            {result.response !== undefined && result.response !== null && (
                                <div className="rounded-md bg-muted/30 border p-3 text-sm font-mono overflow-y-auto max-h-[300px]">
                                    <p className="text-muted-foreground mb-2 text-xs uppercase tracking-wide font-sans font-semibold">Response Body</p>
                                    <JsonNode data={result.response} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

