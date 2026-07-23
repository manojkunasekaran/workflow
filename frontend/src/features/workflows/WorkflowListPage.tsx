import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { workflowApi } from '@/api/workflowApi';
import type { WorkflowDefinition } from '@/types/api';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/layouts/PageHeader';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/hint';
import { ArrowRight, Loader2, Plus, RefreshCw, Workflow } from 'lucide-react';

export default function WorkflowListPage() {
    const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const loadWorkflows = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await workflowApi.getAll();
            setWorkflows([...data].reverse());
        } catch (err) {
            console.error('Failed to load workflows', err);
            setError('Failed to load workflows');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadWorkflows();
    }, []);

    const formatDate = (dateString?: string) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleString();
    };



    if (isLoading) {
        return (
            <div className="flex h-full flex-col bg-background">
                <PageHeader title={<h1 className="text-sm font-semibold">Workflows</h1>} />
                <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col bg-background">
            <PageHeader
                title={<h1 data-testid="workflow-list-heading" className="text-sm font-semibold">Workflows</h1>}
                actions={
                    <>
                        <Button data-testid="refresh-workflows-btn" variant="outline" size="sm" onClick={loadWorkflows}>
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </Button>
                        <Button data-testid="new-workflow-btn-header" size="sm" onClick={() => navigate('/workflows/new')}>
                            <Plus className="h-4 w-4" />
                            New Workflow
                        </Button>
                    </>
                }
            />

            <div className="flex-1 overflow-auto p-6">
                {error && (
                    <div data-testid="workflow-list-error" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
                        {error}
                    </div>
                )}

                {workflows.length === 0 && !error ? (
                    <div data-testid="empty-state-container" className="flex flex-col items-center justify-center py-16 text-center">
                        <Workflow className="mb-4 h-12 w-12 text-muted-foreground/40" />
                        <p className="mb-1 font-medium text-foreground">No workflows yet</p>
                        <p className="mb-6 text-sm text-muted-foreground">
                            Create your first workflow to get started.
                        </p>
                        <Button data-testid="new-workflow-btn-empty" onClick={() => navigate('/workflows/new')}>
                            <Plus className="h-4 w-4" />
                            New Workflow
                        </Button>
                    </div>
                ) : workflows.length > 0 ? (
                    <div data-testid="workflow-table-container" className="overflow-hidden rounded-lg border border-border bg-card">
                        <table className="w-full">
                            <thead className="border-b border-border bg-muted/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                                        Name
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                                        Tasks
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                                        Updated
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                                        ID
                                    </th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {workflows.map((workflow) => (
                                    <tr
                                        key={workflow.id}
                                        data-testid={`workflow-row-${workflow.id}`}
                                        className="cursor-pointer transition-colors hover:bg-muted/30"
                                        onClick={() => navigate(`/workflows/${workflow.id}`)}
                                    >
                                        <td data-testid={`workflow-name-${workflow.id}`} className="px-4 py-3 text-sm font-medium text-foreground">
                                            {workflow.name}
                                        </td>
                                        <td data-testid={`task-count-${workflow.id}`} className="px-4 py-3 text-sm text-muted-foreground">
                                            {workflow.tasks?.length ?? 0}
                                        </td>
                                        <td data-testid={`updated-at-${workflow.id}`} className="px-4 py-3 text-sm text-muted-foreground">
                                            {formatDate(workflow.updatedAt ?? workflow.createdAt)}
                                        </td>
                                        <td data-testid={`workflow-id-${workflow.id}`} className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                            {workflow.id ? `${workflow.id.substring(0, 8)}…` : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <Hint content={`Open ${workflow.name}`}>
                                                    <Button
                                                        data-testid={`open-workflow-btn-${workflow.id}`}
                                                        variant="ghost"
                                                        size="sm"
                                                        className={cn(
                                                            'text-muted-foreground',
                                                            'hover:bg-muted hover:text-foreground',
                                                        )}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            if (workflow.id) {
                                                                navigate(`/workflows/${workflow.id}`);
                                                            }
                                                        }}
                                                        aria-label={`Open ${workflow.name}`}
                                                    >
                                                        <ArrowRight className="h-4 w-4" />
                                                    </Button>
                                                </Hint>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </div>


        </div>
    );
}
