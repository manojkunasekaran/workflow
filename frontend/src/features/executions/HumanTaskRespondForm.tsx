import { useMemo, useState } from 'react';
import { FormRenderer } from '@/features/forms/FormRenderer';
import {
    hasRespondableFields,
    normalizeFormSchema,
    singlePageSchema,
    validateFormPage,
} from '@/features/forms/lib/formSchemaUtils';
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
    const [formAnswers, setFormAnswers] = useState<Record<string, unknown>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const extraFieldsPage = useMemo(() => {
        const schema = normalizeFormSchema(task.parameters?.formSchema);
        return singlePageSchema(schema);
    }, [task.parameters?.formSchema]);
    const showExtraFields = hasRespondableFields(extraFieldsPage);

    const actions = resolveHumanActions(task, taskExecution);
    const description = String(task.parameters?.description ?? '').trim();
    const title = String(task.parameters?.title ?? 'Action required').trim();

    const submit = async (actionId: string) => {
        const name = respondedBy.trim();
        if (!name) {
            setError('Enter your name before responding.');
            return;
        }
        if (showExtraFields) {
            const validationError = validateFormPage(extraFieldsPage, formAnswers);
            if (validationError) {
                setError(validationError);
                return;
            }
        }

        try {
            setIsSubmitting(true);
            setError(null);
            await executionApi.respondToHumanTask(executionId, taskExecution.id, {
                actionId,
                respondedBy: name,
                formData: showExtraFields ? formAnswers : undefined,
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
        <div data-testid="human-task-respond-form" className="overflow-hidden rounded-lg border border-warning/30 bg-warning-muted/60">
            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-warning/30 bg-warning-muted px-3 py-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-warning">
                        Action required · {title}
                    </p>
                    <p className="text-[11px] text-warning/80">
                        This step is waiting for a human decision.
                    </p>
                </div>
            </div>

            <div className="space-y-3 p-3">
                {/* Description */}
                {description ? (
                    <p className="text-xs text-warning/90">{description}</p>
                ) : null}

                {/* Responder name */}
                <div className="space-y-1">
                    <label
                        className="flex items-center gap-1.5 text-[11px] font-medium text-warning"
                        htmlFor="responded-by"
                    >
                        <UserCheck className="h-3 w-3" />
                        Your name or email
                    </label>
                    <Input
                        data-testid="human-task-responder-input"
                        id="responded-by"
                        value={respondedBy}
                        onChange={(event) => setRespondedBy(event.target.value)}
                        placeholder="e.g. you@company.com"
                        disabled={isSubmitting}
                        className="h-8 text-xs bg-white/70 dark:bg-background/50"
                    />
                </div>

                {showExtraFields ? (
                    <FormRenderer
                        page={extraFieldsPage}
                        answers={formAnswers}
                        onAnswersChange={setFormAnswers}
                        hideSubmitButton
                        disabled={isSubmitting}
                        onSubmit={() => undefined}
                    />
                ) : null}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                    {actions.map((action) => {
                        const isRejected = action.outcome === 'REJECTED';
                        return (
                            <Button
                                data-testid={`human-task-action-btn-${action.id}`}
                                key={action.id}
                                type="button"
                                size="sm"
                                disabled={isSubmitting}
                                variant={isRejected ? 'outline' : 'default'}
                                className={cn(
                                    'h-7 text-xs',
                                    isRejected &&
                                        'border-danger/30 text-destructive hover:bg-danger-muted',
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
                    <p data-testid="human-task-error-msg" className="text-[11px] text-destructive">{error}</p>
                ) : null}
            </div>
        </div>
    );
}
