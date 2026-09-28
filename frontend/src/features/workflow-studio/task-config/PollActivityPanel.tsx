import { useCallback, useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Loader2,
    RefreshCw,
    RotateCcw,
    XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { pollTriggerApi, type PollLogEntry, type PollStateResponse } from '@/api/pollTriggerApi';
import { isTriggerNotReadyError } from '@/features/workflow-studio/task-config/triggerActivityUtils';

const PAGE_SIZE = 10;

function formatTimestamp(value?: string): string {
    if (!value) return '—';
    return new Date(value).toLocaleString();
}

interface PollActivityPanelProps {
    workflowId?: string;
    onStateLoaded?: (state: PollStateResponse | null) => void;
}

export function PollActivityPanel({ workflowId, onStateLoaded }: PollActivityPanelProps) {
    const [open, setOpen] = useState(false);
    const [logs, setLogs] = useState<PollLogEntry[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [notReady, setNotReady] = useState(false);
    const [reprocessKeys, setReprocessKeys] = useState('');
    const [reprocessLoading, setReprocessLoading] = useState(false);
    const [reprocessMessage, setReprocessMessage] = useState<string | null>(null);

    const canLoad = !!workflowId && workflowId !== 'NEW_WORKFLOW';

    const loadActivity = useCallback(async (pageIndex = 0) => {
        if (!canLoad || !workflowId) return;

        setLoading(true);
        setNotReady(false);
        try {
            const [state, logsPage] = await Promise.all([
                pollTriggerApi.getPollState(workflowId),
                pollTriggerApi.getLogs(workflowId, pageIndex, PAGE_SIZE),
            ]);
            onStateLoaded?.(state);
            setLogs(logsPage.content);
            setTotalElements(logsPage.totalElements);
            setPage(pageIndex);
        } catch (err: unknown) {
            if (isTriggerNotReadyError(err)) {
                setNotReady(true);
                setLogs([]);
                setTotalElements(0);
                onStateLoaded?.(null);
            } else {
                onStateLoaded?.(null);
            }
        } finally {
            setLoading(false);
        }
    }, [canLoad, onStateLoaded, workflowId]);

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);
        if (nextOpen) {
            void loadActivity(0);
        }
    };

    const handleReprocess = async () => {
        if (!workflowId) return;
        const keys = reprocessKeys
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean);
        if (keys.length === 0) {
            setReprocessMessage('Enter at least one item key.');
            return;
        }

        setReprocessLoading(true);
        setReprocessMessage(null);
        try {
            const result = await pollTriggerApi.reprocess(workflowId, keys);
            if (result.success) {
                const unmatched = result.unmatchedKeys?.length
                    ? ` Unmatched: ${result.unmatchedKeys.join(', ')}.`
                    : '';
                setReprocessMessage(`Triggered ${result.itemsTriggered} item(s).${unmatched}`);
                await loadActivity(0);
            } else {
                setReprocessMessage(result.error ?? 'Reprocess failed.');
            }
        } catch (err: unknown) {
            setReprocessMessage(err instanceof Error ? err.message : 'Reprocess failed.');
        } finally {
            setReprocessLoading(false);
        }
    };

    if (!canLoad) {
        return null;
    }

    const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    return (
        <>
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => handleOpenChange(true)}>
                View poll activity
            </Button>

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="max-w-3xl max-h-[85vh] gap-4 overflow-hidden flex flex-col p-6">
                    <DialogHeader className="px-0">
                        <DialogTitle>Poll activity</DialogTitle>
                        <DialogDescription>Recent poll runs and reprocess actions.</DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center justify-end">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => void loadActivity(page)}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            Refresh
                        </Button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto space-y-3">
                        {notReady ? (
                            <p className="text-sm text-muted-foreground py-2">
                                Save the workflow with poll trigger enabled to view activity.
                            </p>
                        ) : (
                            <>
                                <div className="rounded-md border p-3 space-y-2">
                                    <Label className="text-sm">Reprocess items</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={reprocessKeys}
                                            onChange={(e) => setReprocessKeys(e.target.value)}
                                            placeholder="item-key-1, item-key-2"
                                            className="font-mono text-sm"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="shrink-0 gap-1"
                                            onClick={() => void handleReprocess()}
                                            disabled={reprocessLoading}
                                        >
                                            {reprocessLoading ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <RotateCcw className="h-3.5 w-3.5" />
                                            )}
                                            Reprocess
                                        </Button>
                                    </div>
                                    {reprocessMessage && (
                                        <p className="text-xs text-muted-foreground">{reprocessMessage}</p>
                                    )}
                                </div>

                                {loading && logs.length === 0 ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading activity…
                                    </div>
                                ) : logs.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-2">No poll runs recorded yet.</p>
                                ) : (
                                    <div className="rounded-md border overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[140px]">Time</TableHead>
                                                    <TableHead className="text-right">Fetched</TableHead>
                                                    <TableHead className="text-right">New</TableHead>
                                                    <TableHead className="text-right">Skipped</TableHead>
                                                    <TableHead className="text-right">Duration</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {logs.map((log) => {
                                                    const failed = !!log.error;
                                                    return (
                                                        <TableRow key={log.id}>
                                                            <TableCell className="text-xs text-muted-foreground">
                                                                {formatTimestamp(log.polledAt)}
                                                            </TableCell>
                                                            <TableCell className="text-right text-sm">{log.itemsFetched ?? 0}</TableCell>
                                                            <TableCell className="text-right text-sm">{log.itemsNew ?? 0}</TableCell>
                                                            <TableCell className="text-right text-sm">{log.itemsSkipped ?? 0}</TableCell>
                                                            <TableCell className="text-right text-sm">
                                                                <span className="inline-flex items-center gap-1">
                                                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                                                    {log.durationMs ?? 0}ms
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                {failed ? (
                                                                    <span className="inline-flex items-center gap-1 text-xs text-destructive">
                                                                        <XCircle className="h-3.5 w-3.5" />
                                                                        {log.error}
                                                                    </span>
                                                                ) : log.reprocess ? (
                                                                    <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                                                                        <RotateCcw className="h-3.5 w-3.5" />
                                                                        Reprocess
                                                                    </span>
                                                                ) : log.triggeredExecution ? (
                                                                    <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                                        Triggered
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                                        <AlertTriangle className="h-3.5 w-3.5" />
                                                                        Check run
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}

                                {totalElements > PAGE_SIZE && (
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>
                                            Page {page + 1} of {totalPages} ({totalElements} runs)
                                        </span>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs"
                                                disabled={loading || page === 0}
                                                onClick={() => void loadActivity(page - 1)}
                                            >
                                                Previous
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs"
                                                disabled={loading || page >= totalPages - 1}
                                                onClick={() => void loadActivity(page + 1)}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
