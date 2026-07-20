import { useState } from 'react';
import { Loader2, UserCheck, AlertTriangle } from 'lucide-react';
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
    const title = String(task.parameters?.title ?? 'Action required').trim();

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
        <div className="overflow-hidden rounded-lg border border-amber-300/70 bg-amber-50/60 dark:border-amber-700/40 dark:bg-amber-950/20">
            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-amber-200/80 bg-amber-100/60 px-3 py-2.5 dark:border-amber-800/40 dark:bg-amber-900/20">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                        Action required · {title}
                    </p>
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                        This step is waiting for a human decision.
                    </p>
                </div>
            </div>

            <div className="space-y-3 p-3">
                {/* Description */}
                {description ? (
                    <p className="text-xs text-amber-900/80 dark:text-amber-200/70">{description}</p>
                ) : null}

                {/* Responder name */}
                <div className="space-y-1">
                    <label
                        className="flex items-center gap-1.5 text-[11px] font-medium text-amber-900 dark:text-amber-200"
                        htmlFor="responded-by"
                    >
                        <UserCheck className="h-3 w-3" />
                        Your name or email
                    </label>
                    <Input
                        id="responded-by"
                        value={respondedBy}
                        onChange={(event) => setRespondedBy(event.target.value)}
                        placeholder="e.g. you@company.com"
                        disabled={isSubmitting}
                        className="h-8 text-xs bg-white/70 dark:bg-background/50"
                    />
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                    {actions.map((action) => {
                        const isRejected = action.outcome === 'REJECTED';
                        return (
                            <Button
                                key={action.id}
                                type="button"
                                size="sm"
                                disabled={isSubmitting}
                                variant={isRejected ? 'outline' : 'default'}
                                className={cn(
                                    'h-7 text-xs',
                                    isRejected &&
                                        'border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30',
                                )}
                                onClick={() => void submit(action.id)}
                            >
                                {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                {action.label || action.id}
                            </Button>
                        );
                    })}
                </div>

                {/* Error message */}
                {error ? (
                    <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
                ) : null}
            </div>
        </div>
    );
}
