import { useMemo, useState } from 'react';
import GridLayout from 'react-grid-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { FormFieldDefinition, FormPageDefinition } from '@/types/form';
import { validateFormPage } from '@/features/forms/lib/formSchemaUtils';
import { isFieldVisible } from '@/features/forms/lib/formVisibility';
import { cn } from '@/lib/utils';

export interface FormRendererProps {
    page: FormPageDefinition;
    initialAnswers?: Record<string, unknown>;
    answers?: Record<string, unknown>;
    onAnswersChange?: (answers: Record<string, unknown>) => void;
    submitLabel?: string;
    disabled?: boolean;
    hideSubmitButton?: boolean;
    onSubmit: (answers: Record<string, unknown>) => void | Promise<void>;
}

function FieldControl({
    field,
    value,
    onChange,
    disabled,
}: {
    field: FormFieldDefinition;
    value: unknown;
    onChange: (v: unknown) => void;
    disabled?: boolean;
}) {
    if (field.type === 'SECTION_HEADER') {
        return (
            <div className="pt-2">
                <h3 className="text-sm font-semibold">{field.label}</h3>
                {field.description ? <p className="text-xs text-muted-foreground">{field.description}</p> : null}
            </div>
        );
    }

    if (field.type === 'HIDDEN') {
        return null;
    }

    if (field.type === 'TEXTAREA') {
        return (
            <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={String(value ?? '')}
                disabled={disabled}
                placeholder={field.placeholder}
                onChange={(e) => onChange(e.target.value)}
            />
        );
    }

    if (field.type === 'RADIO') {
        return (
            <div className="space-y-2">
                {(field.options ?? []).map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm">
                        <input
                            type="radio"
                            name={field.key}
                            checked={value === opt}
                            disabled={disabled}
                            onChange={() => onChange(opt)}
                        />
                        {opt}
                    </label>
                ))}
            </div>
        );
    }

    if (field.type === 'SELECT') {
        return (
            <Select value={String(value ?? '')} onValueChange={onChange} disabled={disabled}>
                <SelectTrigger>
                    <SelectValue placeholder={field.placeholder ?? 'Select…'} />
                </SelectTrigger>
                <SelectContent>
                    {(field.options ?? []).map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    if (field.type === 'CHECKBOX' || field.type === 'CONSENT') {
        return (
            <label className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={Boolean(value)}
                    disabled={disabled}
                    onChange={(e) => onChange(e.target.checked)}
                />
                {field.label}
            </label>
        );
    }

    const inputType =
        field.type === 'EMAIL' ? 'email'
        : field.type === 'NUMBER' ? 'number'
        : field.type === 'DATE' ? 'date'
        : field.type === 'DATETIME' ? 'datetime-local'
        : field.type === 'PHONE' ? 'tel'
        : 'text';

    return (
        <Input
            type={inputType}
            value={String(value ?? '')}
            disabled={disabled}
            placeholder={field.placeholder}
            onChange={(e) => onChange(field.type === 'NUMBER' ? Number(e.target.value) : e.target.value)}
        />
    );
}

export function FormRenderer({
    page,
    initialAnswers,
    answers: controlledAnswers,
    onAnswersChange,
    submitLabel,
    disabled,
    hideSubmitButton,
    onSubmit,
}: FormRendererProps) {
    const [internalAnswers, setInternalAnswers] = useState<Record<string, unknown>>(() => ({
        ...initialAnswers,
    }));
    const answers = controlledAnswers ?? internalAnswers;
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fields = page.fields ?? [];
    const visibleFields = useMemo(
        () => fields.filter((f) => isFieldVisible(f, answers)),
        [fields, answers],
    );
    const layoutMode = page.layoutMode ?? 'STACK';

    const gridLayout = useMemo(() => {
        return visibleFields
            .filter((f) => f.type !== 'HIDDEN')
            .map((f) => ({
                i: f.key,
                x: f.layout?.x ?? 0,
                y: f.layout?.y ?? 0,
                w: f.layout?.w ?? 12,
                h: f.layout?.h ?? 1,
                minW: 2,
                minH: 1,
            }));
    }, [visibleFields]);

    const setField = (key: string, value: unknown) => {
        const next = { ...answers, [key]: value };
        if (onAnswersChange) onAnswersChange(next);
        else setInternalAnswers(next);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const validationError = validateFormPage(page, answers);
        if (validationError) {
            setError(validationError);
            return;
        }
        try {
            setSubmitting(true);
            await onSubmit(answers);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Submit failed');
        } finally {
            setSubmitting(false);
        }
    };

    const renderField = (field: FormFieldDefinition) => {
        if (field.type === 'HIDDEN') {
            return (
                <input
                    type="hidden"
                    name={field.key}
                    value={String(answers[field.key] ?? field.defaultValue ?? '')}
                    readOnly
                />
            );
        }
        if (field.type === 'CHECKBOX' || field.type === 'CONSENT') {
            return (
                <FieldControl
                    field={field}
                    value={answers[field.key]}
                    disabled={disabled || submitting}
                    onChange={(v) => setField(field.key, v)}
                />
            );
        }
        return (
            <div className="space-y-1.5">
                {field.type !== 'SECTION_HEADER' ? (
                    <Label>
                        {field.label ?? field.key}
                        {field.required ? <span className="text-destructive"> *</span> : null}
                    </Label>
                ) : null}
                {field.description && field.type !== 'SECTION_HEADER' ? (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                ) : null}
                <FieldControl
                    field={field}
                    value={answers[field.key] ?? field.defaultValue}
                    disabled={disabled || submitting}
                    onChange={(v) => setField(field.key, v)}
                />
            </div>
        );
    };

    return (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {page.title ? <h2 className="text-lg font-semibold">{page.title}</h2> : null}
            {page.descriptionHtml ? (
                <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: page.descriptionHtml }} />
            ) : null}

            {layoutMode === 'GRID' && visibleFields.length > 0 ? (
                <GridLayout
                    className="layout"
                    layout={gridLayout}
                    cols={12}
                    rowHeight={56}
                    width={720}
                    isDraggable={false}
                    isResizable={false}
                    compactType="vertical"
                >
                    {visibleFields.filter((f) => f.type !== 'HIDDEN').map((field) => (
                        <div key={field.key} className={cn('px-1')}>
                            {renderField(field)}
                        </div>
                    ))}
                </GridLayout>
            ) : (
                <div className="space-y-4">
                    {visibleFields.map((field) => (
                        <div key={field.key}>{renderField(field)}</div>
                    ))}
                </div>
            )}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            {!hideSubmitButton ? (
                <Button type="submit" disabled={disabled || submitting}>
                    {submitting ? 'Submitting…' : submitLabel ?? page.submitButtonLabel ?? 'Submit'}
                </Button>
            ) : null}
        </form>
    );
}
