import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { executionApi } from '@/api/executionApi';
import type { WorkflowTaskExecution } from '@/api/executionApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { resolveHumanActions } from '@/features/executions/lib/humanTaskExecution';
import type { WorkflowTask } from '@/types/api';
import { cn } from '@/lib/utils';

interface HumanTaskRespondFormProps {
    executionId: string;
    task: WorkflowTask;
    taskExecution: WorkflowTaskExecution;
    onSuccess: () => void;
}

export function HumanTaskRespondForm({
    executionId,
    task,
    taskExecution,
    onSuccess,
}: HumanTaskRespondFormProps) {
    const [respondedBy, setRespondedBy] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const actions = resolveHumanActions(task, taskExecution);
    const description = String(task.parameters?.description ?? '').trim();

    const submit = async (actionId: string) => {
        const name = respondedBy.trim();
        if (!name) {
            setError('Enter your name before responding.');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            await executionApi.respondToHumanTask(executionId, taskExecution.id, {
                actionId,
                respondedBy: name,
            });
            onSuccess();
        } catch (err) {
            console.error('Human task response failed', err);
            setError('Failed to submit response. Try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4 rounded-md border border-amber-200 bg-amber-50/80 p-4">
            <div>
                <p className="text-sm font-medium text-amber-950">Action required</p>
                <p className="mt-1 text-xs text-amber-900/80">
                    This step is waiting for a human decision.
                </p>
            </div>

            {description ? (
                <p className="text-sm text-foreground">{description}</p>
            ) : null}

            <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="responded-by">
                    Your name
                </label>
                <Input
                    id="responded-by"
                    value={respondedBy}
                    onChange={(event) => setRespondedBy(event.target.value)}
                    placeholder="e.g. you@company.com"
                    disabled={isSubmitting}
                />
            </div>

            <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                    <Button
                        key={action.id}
                        type="button"
                        size="sm"
                        disabled={isSubmitting}
                        variant={action.outcome === 'REJECTED' ? 'outline' : 'default'}
                        className={cn(
                            action.outcome === 'REJECTED' &&
                                'border-destructive/40 text-destructive hover:bg-destructive/5',
                        )}
                        onClick={() => void submit(action.id)}
                    >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {action.label || action.id}
                    </Button>
                ))}
            </div>

            {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
    );
}
