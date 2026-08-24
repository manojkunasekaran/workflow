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
import { connectorApi, type ConnectorTestResult } from '@/api/connectorApi';

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

interface ConnectorTestPanelProps {
    connectorId: string;
    actionId: string;
    credentialId?: string;
    inputs: Record<string, unknown>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConnectorTestPanel({ connectorId, actionId, credentialId, inputs }: ConnectorTestPanelProps) {
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<ConnectorTestResult | null>(null);
    const [dismissed, setDismissed] = useState(false);

    const canRun = !!connectorId && !!actionId;

    const handleTest = async () => {
        if (!canRun) return;

        // Show disclaimer inline the first time
        if (!dismissed) {
            setDismissed(true);
            return; // first click shows the warning; second click runs
        }

        setIsRunning(true);
        setResult(null);
        try {
            const res = await connectorApi.testAction(connectorId, {
                actionId,
                credentialId: credentialId || undefined,
                inputs,
            });
            setResult(res);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setResult({ success: false, statusCode: 0, durationMs: 0, error: message });
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="mt-3 space-y-2 border rounded-lg bg-muted/30 p-3">
            {/* Disclaimer banner — shown on first click */}
            {!dismissed && (
                <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-2 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                        <strong>DISCLAIMER:</strong> This will execute a <strong>live API call</strong> using your credentials.
                        Actions that send messages, create records, or modify data will execute for real.
                        Click <strong>Run Test</strong> again to proceed.
                    </span>
                </div>
            )}

            <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-xs"
                onClick={handleTest}
                disabled={!canRun || isRunning}
            >
                {isRunning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                    <FlaskConical className="h-3.5 w-3.5" />
                )}
                {isRunning ? 'Running…' : dismissed ? 'Run Test (real API call)' : 'Test Action'}
            </Button>

            {result && (
                <div className="space-y-2">
                    {/* Status row */}
                    <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-medium">
                            {result.success ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                                <XCircle className="h-3.5 w-3.5 text-destructive" />
                            )}
                            {result.success ? 'Success' : 'Failed'}
                            {result.statusCode > 0 && (
                                <span className="text-muted-foreground font-normal">· HTTP {result.statusCode}</span>
                            )}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {result.durationMs}ms
                        </span>
                    </div>

                    {/* Error message */}
                    {result.error && (
                        <p className="text-xs text-destructive bg-destructive/5 rounded p-2 font-mono break-all">
                            {result.error}
                        </p>
                    )}

                    {/* Response tree */}
                    {result.response !== undefined && result.response !== null && (
                        <div className="rounded bg-background border p-2 text-xs font-mono max-h-48 overflow-y-auto">
                            <p className="text-muted-foreground mb-1 text-[10px] uppercase tracking-wide">Response</p>
                            <JsonNode data={result.response} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
