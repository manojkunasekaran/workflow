import { useState } from 'react';
import {
    FlaskConical,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { pollTriggerApi, type PollTestResult } from '@/api/pollTriggerApi';

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
                <button onClick={() => setExpanded((e) => !e)} className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground">
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
                <button onClick={() => setExpanded((e) => !e)} className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground">
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

function wouldTrigger(result: PollTestResult): boolean {
    return result.itemsNew > 0 || result.itemsUpdated > 0;
}

interface PollTestPanelProps {
    workflowId?: string;
}

export function PollTestPanel({ workflowId }: PollTestPanelProps) {
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<PollTestResult | null>(null);

    const canRun = !!workflowId && workflowId !== 'NEW_WORKFLOW';

    const handleTest = async () => {
        if (!canRun || !workflowId) return;

        setIsRunning(true);
        setResult(null);
        try {
            const res = await pollTriggerApi.testPoll(workflowId);
            setResult(res);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setResult({
                success: false,
                durationMs: 0,
                itemsFetched: 0,
                itemsNew: 0,
                itemsUpdated: 0,
                itemsSkipped: 0,
                error: message,
            });
        } finally {
            setIsRunning(false);
        }
    };

    const previewPayload = result
        ? {
            itemsFetched: result.itemsFetched,
            itemsNew: result.itemsNew,
            itemsUpdated: result.itemsUpdated,
            itemsSkipped: result.itemsSkipped,
            wouldTrigger: wouldTrigger(result),
            newItems: result.newItems,
            skippedItems: result.skippedItems,
        }
        : null;

    return (
        <Dialog onOpenChange={(open) => { if (!open) setResult(null); }}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    disabled={!canRun}
                >
                    <FlaskConical className="h-3.5 w-3.5" />
                    Test poll
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-5">
                <DialogHeader className="shrink-0 mb-4">
                    <DialogTitle className="flex items-center gap-2">
                        <FlaskConical className="h-5 w-5" />
                        Test Poll
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
                    {!canRun ? (
                        <p className="text-sm text-muted-foreground">
                            Save the workflow first to run a test poll.
                        </p>
                    ) : (
                        <>
                            <p className="text-sm text-muted-foreground">
                                Fetches the configured endpoint and previews change detection. No workflow execution is triggered.
                            </p>

                            <Button
                                variant="default"
                                className="w-full gap-2"
                                onClick={handleTest}
                                disabled={isRunning}
                            >
                                {isRunning ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <FlaskConical className="h-4 w-4" />
                                )}
                                {isRunning ? 'Running…' : 'Run test poll'}
                            </Button>
                        </>
                    )}

                    {result && (
                        <div className="space-y-3 mt-4 border-t pt-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1.5 font-medium">
                                    {result.success ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <XCircle className="h-4 w-4 text-destructive" />
                                    )}
                                    {result.success ? 'Success' : 'Failed'}
                                </span>
                                <span className="flex items-center gap-1 text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5" />
                                    {result.durationMs}ms
                                </span>
                            </div>

                            {result.error && (
                                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3 font-mono break-all">
                                    {result.error}
                                </p>
                            )}

                            {result.warning && (
                                <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md p-3">
                                    {result.warning}
                                </p>
                            )}

                            {result.success && (
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="rounded-md border p-2">
                                        <div className="text-xs text-muted-foreground">Fetched</div>
                                        <div className="font-semibold">{result.itemsFetched}</div>
                                    </div>
                                    <div className="rounded-md border p-2">
                                        <div className="text-xs text-muted-foreground">New</div>
                                        <div className="font-semibold">{result.itemsNew}</div>
                                    </div>
                                    <div className="rounded-md border p-2">
                                        <div className="text-xs text-muted-foreground">Skipped</div>
                                        <div className="font-semibold">{result.itemsSkipped}</div>
                                    </div>
                                    <div className="rounded-md border p-2">
                                        <div className="text-xs text-muted-foreground">Would trigger</div>
                                        <div className="font-semibold">{wouldTrigger(result) ? 'Yes' : 'No'}</div>
                                    </div>
                                </div>
                            )}

                            {previewPayload && (
                                <div className="rounded-md bg-muted/30 border p-3 text-sm font-mono overflow-y-auto max-h-[300px]">
                                    <p className="text-muted-foreground mb-2 text-xs uppercase tracking-wide font-sans font-semibold">Preview</p>
                                    <JsonNode data={previewPayload} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
