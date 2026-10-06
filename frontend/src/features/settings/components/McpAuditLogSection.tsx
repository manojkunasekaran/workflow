import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { mcpSettingsApi, type McpAuditLogEntry } from '@/api/mcpSettingsApi';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

const PAGE_SIZE = 10;

function formatTimestamp(value?: string): string {
    if (!value) return '—';
    return new Date(value).toLocaleString();
}

export function McpAuditLogSection() {
    const [logs, setLogs] = useState<McpAuditLogEntry[]>([]);
    const [page, setPage] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(true);

    const loadLogs = useCallback(async (pageIndex = 0) => {
        setLoading(true);
        try {
            const response = await mcpSettingsApi.getLogs(pageIndex, PAGE_SIZE);
            setLogs(response.content ?? []);
            setTotalElements(response.totalElements ?? 0);
            setPage(pageIndex);
        } catch (err) {
            console.error('Failed to load MCP audit logs', err);
            setLogs([]);
            setTotalElements(0);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadLogs(0);
    }, [loadLogs]);

    const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

    return (
        <div className="flex flex-col space-y-6 h-full pt-2">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium tracking-tight">Audit Logs</h2>
                    <p className="text-sm text-muted-foreground">View recent incoming connections and tool executions.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => loadLogs(page)} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Refresh
                </Button>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-8 flex flex-col gap-6 overflow-hidden">
                {loading && logs.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-12">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading audit logs...
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <p className="text-sm text-muted-foreground">No MCP audit entries yet.</p>
                    </div>
                ) : (
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="py-4">Timestamp</TableHead>
                                    <TableHead className="py-4">Endpoint</TableHead>
                                    <TableHead className="py-4">Tool</TableHead>
                                    <TableHead className="py-4">Auth</TableHead>
                                    <TableHead className="py-4">Success</TableHead>
                                    <TableHead className="py-4">Execution ID</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log, index) => (
                                    <TableRow key={`${log.timestamp ?? 'row'}-${index}`} className="hover:bg-muted/50">
                                        <TableCell className="text-xs whitespace-nowrap py-4">
                                            {formatTimestamp(log.timestamp)}
                                        </TableCell>
                                        <TableCell className="text-xs max-w-[160px] truncate py-4" title={log.endpoint}>
                                            {log.endpoint || '—'}
                                        </TableCell>
                                        <TableCell className="text-xs py-4">{log.tool || '—'}</TableCell>
                                        <TableCell className="text-xs py-4">
                                            {log.authResult ? (
                                                <StatusBadge
                                                    variant={
                                                        log.authResult.toUpperCase() === 'SUCCESS' ||
                                                        log.authResult.toUpperCase() === 'OK'
                                                            ? 'success'
                                                            : 'warning'
                                                    }
                                                >
                                                    {log.authResult}
                                                </StatusBadge>
                                            ) : (
                                                '—'
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs py-4">
                                            {log.success == null ? (
                                                '—'
                                            ) : (
                                                <StatusBadge variant={log.success ? 'success' : 'danger'}>
                                                    {log.success ? 'Yes' : 'No'}
                                                </StatusBadge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs font-mono max-w-[120px] truncate py-4" title={log.executionId}>
                                            {log.executionId || '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {totalElements > PAGE_SIZE && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-4">
                        <span>
                            Page {page + 1} of {totalPages} ({totalElements} entries)
                        </span>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={page <= 0 || loading}
                                onClick={() => loadLogs(page - 1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={page + 1 >= totalPages || loading}
                                onClick={() => loadLogs(page + 1)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
