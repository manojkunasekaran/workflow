/**
 * VariableInput.tsx
 *
 * The Fixed / Expression toggle wrapper.
 *
 * - "Fixed" mode: renders the standard control (passed as `children`).
 * - "Expression" mode: renders `ExpressionEditor` with the DataExplorer popover.
 *
 * The toggle persists per-field within the current config session.
 * When the value already contains a `{{ }}` expression, we default to Expression mode.
 */

import { useState, type ReactNode } from 'react';
import { Equal, Braces } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isExpression } from '@/features/workflow-studio/lib/variableExplorer';
import { ExpressionEditor } from '@/features/workflow-studio/task-config/ExpressionEditor';

type InputMode = 'fixed' | 'expression';

interface VariableInputProps {
    fieldKey: string;
    label: ReactNode;
    /** Raw current value from parameters */
    value: unknown;
    /** Called with the new string value */
    onChange: (value: string) => void;
    /** Fixed-mode control (child of this wrapper) */
    children: ReactNode;
    placeholder?: string;
    mono?: boolean;
    rows?: number;
    multiline?: boolean;
    error?: string;
    description?: string;
    disabled?: boolean;
}

export function VariableInput({
    fieldKey,
    label,
    value,
    onChange,
    children,
    placeholder,
    mono,
    rows,
    multiline,
    error,
    description,
    disabled,
}: VariableInputProps) {
    const strVal = value === undefined || value === null ? '' : String(value);
    const [mode, setMode] = useState<InputMode>(() =>
        isExpression(strVal) ? 'expression' : 'fixed',
    );
    const [explorerOpen, setExplorerOpen] = useState(false);

    const handleModeToggle = (next: InputMode) => {
        setMode(next);
        // When switching FROM expression back to fixed, clear the value so
        // the fixed control doesn't show a raw `{{...}}` string.
        if (next === 'fixed' && isExpression(strVal)) {
            onChange('');
        }
    };

    return (
        <div className="space-y-1.5">
            {/* Label row with Fixed / Expression toggle */}
            <div className="flex items-center justify-between gap-2">
                <label
                    className="text-xs font-medium text-foreground"
                    htmlFor={fieldKey}
                >
                    {label}
                </label>

                {!disabled && (
                    <div className="flex items-center gap-2">
                        {mode === 'expression' && (
                            <div
                                className="flex items-center rounded-md border border-border bg-muted p-0.5"
                                role="group"
                                aria-label="Variables control"
                            >
                                <button
                                    type="button"
                                    data-testid="expression-open-explorer"
                                    onClick={() => setExplorerOpen((p) => !p)}
                                    className={cn(
                                        'flex items-center gap-1 rounded px-1.5 py-[1px] text-[10px] font-medium transition-colors',
                                        explorerOpen
                                            ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    <Braces className="h-2.5 w-2.5" />
                                    Variables
                                </button>
                            </div>
                        )}

                        <div
                            data-testid={`variable-input-toggle-${fieldKey}`}
                            className="flex items-center rounded-md border border-border bg-muted p-0.5"
                            role="group"
                            aria-label="Input mode"
                        >
                            <button
                                type="button"
                                data-testid={`variable-input-toggle-fixed-${fieldKey}`}
                                onClick={() => handleModeToggle('fixed')}
                                title="Fixed value"
                                className={cn(
                                    'flex items-center gap-1 rounded px-1.5 py-[1px] text-[10px] font-medium transition-colors',
                                    mode === 'fixed'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                <Equal className="h-2.5 w-2.5" />
                                Fixed
                            </button>
                            <button
                                type="button"
                                data-testid={`variable-input-toggle-expression-${fieldKey}`}
                                onClick={() => handleModeToggle('expression')}
                                title="Expression / variable"
                                className={cn(
                                    'flex items-center gap-1 rounded px-1.5 py-[1px] text-[10px] font-medium transition-colors',
                                    mode === 'expression'
                                        ? 'bg-violet-100 text-violet-700 shadow-sm dark:bg-violet-900/40 dark:text-violet-400'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                <Braces className="h-2.5 w-2.5" />
                                Expression
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Content area */}
            {mode === 'fixed' ? (
                children
            ) : (
                <ExpressionEditor
                    id={fieldKey}
                    value={strVal}
                    onChange={onChange}
                    placeholder={placeholder ?? `{{$tasks.previous_task.body}}`}
                    mono={mono}
                    rows={rows}
                    multiline={multiline}
                    data-testid={`expression-editor-${fieldKey}`}
                    explorerOpen={explorerOpen}
                    setExplorerOpen={setExplorerOpen}
                />
            )}

            {description && (
                <p className="text-[11px] text-muted-foreground">{description}</p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
