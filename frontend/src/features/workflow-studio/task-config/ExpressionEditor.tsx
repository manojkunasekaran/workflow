/**
 * ExpressionEditor.tsx
 *
 * A premium textarea that:
 *  - Highlights `{{ ... }}` expressions with a violet pill style (via a transparent
 *    overlay div trick — the textarea stays editable but an overlay div renders the
 *    highlighted version below it using pointer-events:none).
 *  - Shows the DataExplorer popover anchored to the right of the field whenever the
 *    user types `{{` or clicks the "Variables" button.
 *  - Inserts the selected expression at the current cursor position.
 */

import {
    useRef,
    useCallback,
    useEffect,
    type ChangeEvent,
    type KeyboardEvent,
} from 'react';
import { cn } from '@/lib/utils';
import { DataExplorer } from '@/features/workflow-studio/task-config/DataExplorer';
import { useVariableExplorerContext } from '@/features/workflow-studio/task-config/VariableExplorerContext';
import { STUDIO_INPUT_FOCUS_CLASS } from '@/features/workflow-studio/constants/studioUi';

interface ExpressionEditorProps {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    mono?: boolean;
    rows?: number;
    multiline?: boolean;
    className?: string;
    'data-testid'?: string;
    explorerOpen: boolean;
    setExplorerOpen: (open: boolean | ((p: boolean) => boolean)) => void;
}

// Renders plain text with `{{ ... }}` wrapped in a styled span so we can display
// it in a behind-the-scenes overlay. The textarea itself is transparent.
function highlightExpressions(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(
            /(\{\{[^}]*\}\})/g,
            '<mark class="expression-pill">$1</mark>',
        );
}

export function ExpressionEditor({
    id,
    value,
    onChange,
    placeholder,
    mono = false,
    rows = 1,
    multiline = false,
    className,
    'data-testid': testId,
    explorerOpen,
    setExplorerOpen,
}: ExpressionEditorProps) {
    const { currentNodeId } = useVariableExplorerContext();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Auto-trigger the explorer when the user types `{{`
    const handleChange = useCallback(
        (e: ChangeEvent<HTMLTextAreaElement>) => {
            const next = e.target.value;
            onChange(next);
            // Open explorer on `{{` trigger
            const cursor = e.target.selectionStart ?? 0;
            const before = next.slice(0, cursor);
            if (before.endsWith('{{') && !explorerOpen) {
                setExplorerOpen(true);
            }
        },
        [onChange, explorerOpen],
    );

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Escape' && explorerOpen) {
                e.stopPropagation();
                setExplorerOpen(false);
            }
        },
        [explorerOpen],
    );

    const insertExpression = useCallback(
        (expression: string) => {
            const el = textareaRef.current;
            if (!el) {
                // Append to end if no ref
                onChange(`${value}${expression}`);
                setExplorerOpen(false);
                return;
            }
            const start = el.selectionStart ?? value.length;
            const end = el.selectionEnd ?? value.length;

            // If the user typed `{{`, replace those two chars with the full expression
            const before = value.slice(0, start);
            const after = value.slice(end);
            const withoutOpenBraces = before.endsWith('{{')
                ? before.slice(0, -2)
                : before;

            const next = `${withoutOpenBraces}${expression}${after}`;
            onChange(next);
            setExplorerOpen(false);

            // Restore focus + move cursor to after the inserted expression
            requestAnimationFrame(() => {
                el.focus();
                const newCursor = withoutOpenBraces.length + expression.length;
                el.setSelectionRange(newCursor, newCursor);
            });
        },
        [value, onChange],
    );

    // Close explorer when clicking outside
    useEffect(() => {
        if (!explorerOpen) return;
        const handlePointerDown = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setExplorerOpen(false);
            }
        };
        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [explorerOpen]);

    const isMultiline = multiline || rows > 1;

    return (
        <div ref={wrapperRef} className="relative flex flex-col gap-1">
            {/* Expression highlight overlay + textarea */}
            <div className="relative">
                {/* Overlay that renders highlighted expressions */}
                <div
                    aria-hidden="true"
                    className={cn(
                        'pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words rounded-md px-3 py-2 text-transparent',
                        mono ? 'font-mono text-xs' : 'text-sm',
                        '[&_.expression-pill]:rounded [&_.expression-pill]:bg-violet-100 [&_.expression-pill]:text-violet-700',
                        '[&_.expression-pill]:dark:bg-violet-900/40 [&_.expression-pill]:dark:text-violet-400',
                        // Same line-height/padding as the textarea
                        'leading-relaxed',
                    )}
                    dangerouslySetInnerHTML={{ __html: `${highlightExpressions(value)}&nbsp;` }}
                />

                {isMultiline ? (
                    <textarea
                        ref={textareaRef}
                        id={id}
                        data-testid={testId ?? 'expression-editor'}
                        value={value}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        rows={rows}
                        className={cn(
                            'relative w-full resize-y rounded-md border border-input bg-transparent px-3 py-2',
                            'leading-relaxed text-foreground outline-none',
                            'placeholder:text-muted-foreground',
                            mono ? 'font-mono text-xs' : 'text-sm',
                            STUDIO_INPUT_FOCUS_CLASS,
                            // Make text semi-transparent so the overlay highlight shows
                            '[caret-color:currentColor] [color:transparent]',
                            '[text-shadow:0_0_0_hsl(var(--foreground))]',
                            className,
                        )}
                    />
                ) : (
                    <input
                        ref={textareaRef as unknown as React.RefObject<HTMLInputElement>}
                        id={id}
                        data-testid={testId ?? 'expression-editor'}
                        type="text"
                        value={value}
                        onChange={handleChange as unknown as React.ChangeEventHandler<HTMLInputElement>}
                        onKeyDown={handleKeyDown as unknown as React.KeyboardEventHandler<HTMLInputElement>}
                        placeholder={placeholder}
                        className={cn(
                            'relative w-full rounded-md border border-input bg-transparent px-3 py-2',
                            'text-foreground outline-none',
                            'placeholder:text-muted-foreground',
                            mono ? 'font-mono text-xs' : 'text-sm',
                            STUDIO_INPUT_FOCUS_CLASS,
                            '[caret-color:currentColor] [color:transparent]',
                            '[text-shadow:0_0_0_hsl(var(--foreground))]',
                            className,
                        )}
                    />
                )}
            </div>

            {/* DataExplorer popover */}
            {explorerOpen && (
                <div className="absolute right-0 top-full z-50 mt-1">
                    <DataExplorer
                        currentNodeId={currentNodeId}
                        onSelect={insertExpression}
                        onClose={() => setExplorerOpen(false)}
                    />
                </div>
            )}
        </div>
    );
}
