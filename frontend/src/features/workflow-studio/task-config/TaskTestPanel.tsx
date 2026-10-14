import { useRef, useState } from 'react';
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
import { sanitizeWorkflowDefinitionForTestNode } from '@/features/workflow-studio/lib/sanitizeTestNodeDraft';
import {
    CALLOUT_WARNING_INLINE,
    JSON_PREVIEW_NUMBER,
    JSON_PREVIEW_STRING,
    jsonBooleanClass,
} from './jsonPreviewStyles';

// ─── JSON Tree Viewer ─────────────────────────────────────────────────────────

function JsonNode({ data, depth = 0 }: { data: unknown; depth?: number }) {
    const [expanded, setExpanded] = useState(depth < 2);
    const indent = depth * 16;

    if (data === null || data === undefined) {
        return <span className="text-muted-foreground">null</span>;
    }
    if (typeof data === 'boolean') {
        return <span className={jsonBooleanClass(data)}>{String(data)}</span>;
    }
    if (typeof data === 'number') {
        return <span className={JSON_PREVIEW_NUMBER}>{data}</span>;
    }
    if (typeof data === 'string') {
        return <span className={JSON_PREVIEW_STRING}>"{data}"</span>;
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
    const testGenerationRef = useRef(0);

    const targetTaskId = (parameters.__taskId as string) || (parameters.taskId as string);
    const canRun = !!targetTaskId;

    const handleTest = async () => {
        if (!canRun) return;

        const runId = ++testGenerationRef.current;
        setIsRunning(true);
        setResult(null);
        try {
            const { nodes, edges } = useWorkflowStore.getState();

            const { flowToDefinition } = await import('@/features/workflow-studio/lib/workflowGraph');

            const draftDefinition = sanitizeWorkflowDefinitionForTestNode(
                flowToDefinition(
                    'Test Draft',
                    nodes,
                    edges,
                    { id: 'draft-test', name: 'Test Draft', tasks: [], layout: {} } as any,
                ),
            );

            const cachedSampleData: Record<string, unknown> = {};
            nodes.forEach(n => {
                const nodeData = n.data as { sampleData?: Record<string, unknown> };
                if (nodeData?.sampleData) {
                    cachedSampleData[n.id] = nodeData.sampleData;
                }
            });

            const res = await workflowApi.testNode(targetTaskId, draftDefinition, cachedSampleData);

            if (runId !== testGenerationRef.current) {
                return;
            }

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
                } as ConnectorTestResult);
                return;
            }

            setResult({
                success: true,
                statusCode: 200,
                durationMs: 0,
                response: res.targetResult
            } as ConnectorTestResult);

            if (res.newSampleData) {
                Object.entries(res.newSampleData).forEach(([tid, data]) => {
                    useWorkflowStore.getState().updateTaskSampleData(tid, data as Record<string, unknown>);
                });
            }

        } catch (err: unknown) {
            if (runId !== testGenerationRef.current) {
                return;
            }
            const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                || (err instanceof Error ? err.message : 'Unknown error');
            setResult({ success: false, statusCode: 0, durationMs: 0, error: message });
        } finally {
            if (runId === testGenerationRef.current) {
                setIsRunning(false);
            }
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
                        <FlaskConical className="h-5 w-5 text-muted-foreground" />
                        Test task
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Runs this task against the current canvas (including unsaved edits). Upstream tasks execute with cached sample data when available.
                    </p>

                    <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleTest()}
                        disabled={isRunning || !canRun}
                        className="gap-2"
                    >
                        {isRunning ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Running…
                            </>
                        ) : (
                            <>
                                <FlaskConical className="h-4 w-4" />
                                Run Test
                            </>
                        )}
                    </Button>

                    {result ? (
                        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                {result.success ? (
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                ) : (
                                    <XCircle className="h-5 w-5 text-destructive" />
                                )}
                                <span className="font-medium text-sm">
                                    {result.success ? 'Success' : 'Failed'}
                                </span>
                                {result.durationMs != null && result.durationMs > 0 ? (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                                        <Clock className="h-3 w-3" />
                                        {result.durationMs}ms
                                    </span>
                                ) : null}
                            </div>

                            {result.error ? (
                                <p className={CALLOUT_WARNING_INLINE}>{result.error}</p>
                            ) : null}

                            {result.response != null ? (
                                <div className="text-xs font-mono overflow-x-auto">
                                    <JsonNode data={result.response} />
                                </div>
                            ) : null}

                            {!result.success && !result.error ? (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    No detailed error message returned.
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}
