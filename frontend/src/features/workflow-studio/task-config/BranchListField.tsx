import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
    ParallelBranchRow,
    TaskParameterErrors,
} from '@/features/workflow-studio/task-type-schema/types';
import {
    STUDIO_GHOST_DESTRUCTIVE_CLASS,
    STUDIO_TEXT_LINK_CLASS,
} from '@/features/workflow-studio/constants/studioUi';
import { cn } from '@/lib/utils';

function parseBranches(value: unknown): ParallelBranchRow[] {
    if (!Array.isArray(value) || value.length === 0) {
        return [{ branchName: 'Branch 1', startTaskId: '' }];
    }
    return value.map((item, index) => {
        if (!item || typeof item !== 'object') {
            return { branchName: `Branch ${index + 1}`, startTaskId: '' };
        }
        const row = item as Record<string, unknown>;
        return {
            branchName: String(row.branchName ?? ''),
            startTaskId: String(row.startTaskId ?? ''),
        };
    });
}

interface BranchListFieldProps {
    fieldKey: string;
    label: string;
    description?: string;
    value: unknown;
    onChange: (branches: ParallelBranchRow[]) => void;
    errors?: TaskParameterErrors;
}

export function BranchListField({
    fieldKey,
    label,
    description,
    value,
    onChange,
    errors = {},
}: BranchListFieldProps) {
    const branches = parseBranches(value);

    const updateBranch = (index: number, patch: Partial<ParallelBranchRow>) => {
        const next = branches.map((branch, i) => (i === index ? { ...branch, ...patch } : branch));
        onChange(next);
    };

    const addBranch = () => {
        onChange([...branches, { branchName: `Branch ${branches.length + 1}`, startTaskId: '' }]);
    };

    const removeBranch = (index: number) => {
        if (branches.length <= 1) return;
        onChange(branches.filter((_, i) => i !== index));
    };

    const listError = errors[fieldKey];

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-foreground">{label}</label>
                <button
                    type="button"
                    onClick={addBranch}
                    className={STUDIO_TEXT_LINK_CLASS}
                >
                    <Plus className="h-3 w-3" />
                    Add branch
                </button>
            </div>

            {description && <p className="text-[11px] text-muted-foreground">{description}</p>}

            <div className="space-y-3">
                {branches.map((branch, index) => {
                    const nameError = errors[`${fieldKey}.${index}.branchName`];
                    const startError = errors[`${fieldKey}.${index}.startTaskId`];
                    const wired = Boolean(branch.startTaskId.trim());

                    return (
                        <div
                            key={index}
                            className="rounded-md border border-border bg-muted/30 p-3 space-y-2.5"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Branch {index + 1}
                                </span>
                                {branches.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className={cn('h-7 w-7', STUDIO_GHOST_DESTRUCTIVE_CLASS)}
                                        onClick={() => removeBranch(index)}
                                        aria-label={`Remove branch ${index + 1}`}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label
                                    className="text-xs font-medium text-foreground"
                                    htmlFor={`${fieldKey}-${index}-name`}
                                >
                                    Name
                                </label>
                                <Input
                                    id={`${fieldKey}-${index}-name`}
                                    value={branch.branchName}
                                    onChange={(e) => updateBranch(index, { branchName: e.target.value })}
                                    placeholder="e.g. US region"
                                    className="text-sm"
                                />
                                {nameError && (
                                    <p className="text-xs text-destructive">{nameError}</p>
                                )}
                            </div>

                            <p
                                className={
                                    wired
                                        ? 'text-[11px] font-mono text-emerald-700'
                                        : 'text-[11px] text-muted-foreground'
                                }
                            >
                                {wired
                                    ? `→ ${branch.startTaskId}`
                                    : 'Drag from this branch’s output handle on the canvas'}
                            </p>
                            {startError && (
                                <p className="text-xs text-destructive">{startError}</p>
                            )}
                        </div>
                    );
                })}
            </div>

            {listError && <p className="text-xs text-destructive">{listError}</p>}
        </div>
    );
}
