import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { executionApi, type WorkflowExecution } from '@/api/executionApi';
import { PageHeader } from '@/layouts/PageHeader';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, ArrowRight } from 'lucide-react';

export default function ExecutionsList() {
    const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadExecutions();
    }, []);

    const loadExecutions = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await executionApi.getAll();
            setExecutions(data);
        } catch (err) {
            console.error('Failed to load executions', err);
            setError('Failed to load executions');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return 'text-green-600 bg-green-50 border-green-200';
            case 'FAILED':
                return 'text-red-600 bg-red-50 border-red-200';
            case 'RUNNING':
            case 'QUEUED':
                return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    if (isLoading) {
        return (
            <div className="flex h-full flex-col bg-background">
                <PageHeader
                    title={<h1 className="text-sm font-semibold">Executions</h1>}
                />
                <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col bg-background">
            <PageHeader
                title={<h1 className="text-sm font-semibold">Executions</h1>}
                actions={
                    <Button variant="outline" size="sm" onClick={loadExecutions}>
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </Button>
                }
            />

            <div className="flex-1 overflow-auto p-6">
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
                        {error}
                    </div>
                )}

                {executions.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                        No executions found. Run a workflow to see executions here.
                    </div>
                ) : (
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Execution ID
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Workflow ID
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Start Time
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Tasks
                                    </th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {executions.map((execution) => (
                                    <tr
                                        key={execution.id}
                                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                                        onClick={() => navigate(`/executions/${execution.id}`)}
                                    >
                                        <td className="px-4 py-3 text-sm font-mono text-foreground">
                                            {execution.id.substring(0, 8)}...
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                                            {execution.workflowId?.substring(0, 8) || 'N/A'}...
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${getStatusColor(
                                                    execution.status
                                                )}`}
                                            >
                                                {execution.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {formatDate(execution.startTime)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {execution.taskExecutionSummaries?.length || 0}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Button variant="ghost" size="sm">
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
