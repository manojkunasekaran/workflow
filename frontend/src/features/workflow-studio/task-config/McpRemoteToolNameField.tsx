import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { connectionApi } from '@/api/connectionApi';
import type { McpToolDescriptor } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SimpleSelect } from '@/components/ui/select';

interface McpRemoteToolNameFieldProps {
    id: string;
    label: ReactNode;
    credentialId?: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    description?: string;
}

export function McpRemoteToolNameField({
    id,
    label,
    credentialId,
    value,
    onChange,
    error,
    description,
}: McpRemoteToolNameFieldProps) {
    const [remoteTools, setRemoteTools] = useState<McpToolDescriptor[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const loadTools = useCallback(async () => {
        if (!credentialId) {
            setRemoteTools([]);
            setLoadError(null);
            return;
        }
        setLoading(true);
        setLoadError(null);
        try {
            const tools = await connectionApi.listMcpTools(credentialId);
            setRemoteTools(tools);
        } catch (err) {
            setRemoteTools([]);
            setLoadError(err instanceof Error ? err.message : 'Failed to load MCP tools');
        } finally {
            setLoading(false);
        }
    }, [credentialId]);

    useEffect(() => {
        void loadTools();
    }, [loadTools]);

    const hasTools = remoteTools.length > 0;

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
                {label}
                {credentialId && (
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => loadTools()} disabled={loading}>
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    </Button>
                )}
            </div>

            {!credentialId ? (
                <Input id={id} value="" disabled placeholder="Select a connection first" />
            ) : hasTools ? (
                <SimpleSelect
                    id={id}
                    value={value}
                    onValueChange={onChange}
                    allowEmpty
                    emptyLabel="— Select tool —"
                    options={remoteTools.map((tool) => ({
                        label: tool.description ? `${tool.name} — ${tool.description}` : tool.name,
                        value: tool.name,
                    }))}
                />
            ) : (
                <Input
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={loading ? 'Loading tools...' : 'Enter remote tool name'}
                    disabled={loading}
                />
            )}

            {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
            {loadError && <p className="text-xs text-destructive">{loadError}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
