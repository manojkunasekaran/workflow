import { useCallback, useState } from 'react';
import { CheckCircle2, Copy, Loader2, RefreshCw, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    webhookTriggerApi,
    type WebhookLogEntry,
    type WebhookStateResponse,
} from '@/api/webhookTriggerApi';
import { isTriggerNotReadyError } from '@/features/workflow-studio/task-config/triggerActivityUtils';

const PAGE_SIZE = 10;

function formatTimestamp(value?: string): string {
    if (!value) return '—';
    return new Date(value).toLocaleString();
}

function friendlyDeliveryStatus(log: WebhookLogEntry): { label: string; tone: 'success' | 'muted' | 'danger' } {
    if (!log.success) {
        return { label: 'Rejected', tone: 'danger' };
    }
    if (log.error?.toLowerCase().includes('duplicate')) {
        return { label: 'Duplicate ignored', tone: 'muted' };
    }
    if (log.triggeredExecution) {
        return { label: 'Event received', tone: 'success' };
    }
    return { label: 'Duplicate ignored', tone: 'muted' };
}

interface WebhookActivityPanelProps {
    workflowId?: string;
    onStateLoaded?: (state: WebhookStateResponse | null) => void;
}

export function WebhookActivityPanel({ workflowId, onStateLoaded }: WebhookActivityPanelProps) {
    const [open, setOpen] = useState(false);
    const [logs, setLogs] = useState<WebhookLogEntry[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [notReady, setNotReady] = useState(false);

    const canLoad = !!workflowId && workflowId !== 'NEW_WORKFLOW';

    const loadActivity = useCallback(async (pageIndex = 0) => {
        if (!canLoad || !workflowId) return;

        setLoading(true);
        setNotReady(false);
        try {
            const [state, logsPage] = await Promise.all([
                webhookTriggerApi.getWebhookState(workflowId),
                webhookTriggerApi.getLogs(workflowId, pageIndex, PAGE_SIZE),
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

    if (!canLoad) {
        return null;
    }

    const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    return (
        <>
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => handleOpenChange(true)}>
                View recent deliveries
            </Button>

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="max-w-2xl max-h-[85vh] gap-4 overflow-hidden flex flex-col p-6">
                    <DialogHeader className="px-0">
                        <DialogTitle>Recent deliveries</DialogTitle>
                        <DialogDescription>Inbound webhook events for this workflow.</DialogDescription>
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
                                Save the workflow with webhook enabled to view deliveries.
                            </p>
                        ) : loading && logs.length === 0 ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading deliveries…
                            </div>
                        ) : logs.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">No deliveries recorded yet.</p>
                        ) : (
                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[140px]">Time</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right w-[90px]">Duration</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.map((log) => {
                                            const status = friendlyDeliveryStatus(log);
                                            return (
                                                <TableRow key={log.id}>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {formatTimestamp(log.timestamp)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={cnStatusTone(status.tone)}>
                                                            {status.tone === 'success' && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                            {status.tone === 'danger' && <ShieldX className="h-3.5 w-3.5" />}
                                                            {status.tone === 'muted' && <Copy className="h-3.5 w-3.5" />}
                                                            {status.label}
                                                        </span>
                                                        {log.error && status.tone === 'danger' && (
                                                            <p className="text-xs text-destructive/80 mt-0.5">{log.error}</p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm">
                                                        {log.durationMs ?? 0}ms
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {!notReady && totalElements > PAGE_SIZE && (
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>
                                    Page {page + 1} of {totalPages} ({totalElements} deliveries)
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
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

function cnStatusTone(tone: 'success' | 'muted' | 'danger'): string {
    const base = 'inline-flex items-center gap-1 text-xs';
    if (tone === 'success') return `${base} text-green-600 dark:text-green-400`;
    if (tone === 'danger') return `${base} text-destructive`;
    return `${base} text-muted-foreground`;
}
