import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { formSubmissionApi, type FormSubmission } from '@/api/formSubmissionApi';
import { Button } from '@/components/ui/button';

interface WorkflowFormSubmissionsPanelProps {
    workflowDefinitionId: string;
}

export function WorkflowFormSubmissionsPanel({ workflowDefinitionId }: WorkflowFormSubmissionsPanelProps) {
    const [items, setItems] = useState<FormSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await formSubmissionApi.list(workflowDefinitionId, page);
            setItems(res.content ?? []);
            setTotalPages(res.totalPages ?? 0);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load submissions');
        } finally {
            setLoading(false);
        }
    }, [workflowDefinitionId, page]);

    useEffect(() => {
        void load();
    }, [load]);

    if (loading && items.length === 0) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return <p className="text-sm text-destructive p-4">{error}</p>;
    }

    if (items.length === 0) {
        return <p className="text-sm text-muted-foreground p-4">No form submissions yet.</p>;
    }

    return (
        <div className="flex flex-col gap-3 p-4">
            <ul className="space-y-3">
                {items.map((submission) => (
                    <li key={submission.id} className="rounded-lg border border-border p-3 text-sm space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">
                                {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : submission.id}
                                {submission.environment ? ` · ${submission.environment}` : ''}
                            </span>
                            <Button variant="outline" size="sm" asChild>
                                <Link to={`/executions/${submission.workflowExecutionId}`}>Execution</Link>
                            </Button>
                        </div>
                        {submission.steps?.map((step) => (
                            <div key={`${submission.id}-${step.stepId}`} className="rounded bg-muted/40 p-2 text-xs">
                                <p className="font-medium text-foreground mb-1">{step.stepId ?? 'step'}</p>
                                <pre className="whitespace-pre-wrap break-all text-muted-foreground">
                                    {JSON.stringify(step.answers ?? {}, null, 2)}
                                </pre>
                            </div>
                        ))}
                    </li>
                ))}
            </ul>
            {totalPages > 1 ? (
                <div className="flex gap-2 justify-center">
                    <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
                        Previous
                    </Button>
                    <span className="text-xs text-muted-foreground self-center">
                        Page {page + 1} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page + 1 >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Next
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
