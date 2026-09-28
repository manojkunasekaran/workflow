import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { connectorApi, type ConnectorTestResult } from '@/api/connectorApi';

interface Props {
    connectorId: string;
    actionId: string;
    inputs: Record<string, unknown>;
    credentialId?: string;
}

function JsonNode({ data, depth = 0 }: { data: unknown; depth?: number }) {
    if (data === null || data === undefined) {
        return <span className="text-muted-foreground">null</span>;
    }
    if (typeof data !== 'object') {
        return <span>{String(data)}</span>;
    }
    if (Array.isArray(data)) {
        return (
            <div>
                {data.map((item, index) => (
                    <div key={index}>
                        <JsonNode data={item} depth={depth + 1} />
                    </div>
                ))}
            </div>
        );
    }
    return (
        <div>
            {Object.entries(data as Record<string, unknown>).map(([key, value]) => (
                <div key={key}>
                    <span>{key}:</span>
                    <JsonNode data={value} depth={depth + 1} />
                </div>
            ))}
        </div>
    );
}

export function ConnectorTestPanel({ connectorId, actionId, inputs, credentialId }: Props) {
    const [armed, setArmed] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<ConnectorTestResult | null>(null);

    const handleClick = async () => {
        if (!armed) {
            setArmed(true);
            return;
        }

        setIsRunning(true);
        try {
            const response = await connectorApi.testAction(connectorId, {
                actionId,
                credentialId,
                inputs,
            });
            setResult(response);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="space-y-3">
            {armed && (
                <p>DISCLAIMER: This will execute a live API call</p>
            )}
            <Button onClick={handleClick} disabled={isRunning}>
                {armed ? 'Run Test (Real API Call)' : 'Test Action'}
            </Button>
            {result && (
                <div className="space-y-2">
                    <div>
                        <span>{result.success ? 'Success' : 'Failed'}</span>
                        <span>{result.durationMs}ms</span>
                    </div>
                    {result.error && <p>{result.error}</p>}
                    {result.response !== undefined && result.response !== null && (
                        <JsonNode data={result.response} />
                    )}
                </div>
            )}
        </div>
    );
}
