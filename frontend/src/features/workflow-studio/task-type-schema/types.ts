export interface TaskFieldOption {
    label: string;
    value: string;
    description?: string;
}

/** JSON-serializable field kinds — safe to load from backend later. */
export type TaskFieldType =
    | 'text'
    | 'textarea'
    | 'number'
    | 'select'
    | 'segmented'
    | 'keyValue'
    | 'json'
    | 'taskRef'
    | 'branchList'
    | 'conditionalBranchList'
    | 'humanActionList'
    | 'iteratorActionList'
    | 'toolsList'
    | 'wiredRef'
    | 'inboundList'
    | 'waitDuration'
    | 'credential';

/** How many inbounds a JOIN waits for before continuing. */
export type JoinWaitPolicy = 'ALL' | 'ANY' | 'QUORUM';

/** How JOIN merges inbound outputs. */
export type JoinMergeMode = 'PASS_THROUGH' | 'COLLECT_OUTPUTS';

/** One parallel path in a BRANCH task — matches backend ParallelBranch. */
export interface ParallelBranchRow {
    branchName: string;
    startTaskId: string;
}

export interface TaskFieldSchema {
    key: string;
    label: string;
    type: TaskFieldType;
    placeholder?: string;
    description?: string;
    required?: boolean;
    defaultValue?: unknown;
    options?: TaskFieldOption[];
    rows?: number;
    mono?: boolean;
    min?: number;
    filterTypes?: string[];
    excludeSelf?: boolean;
    /** Dynamically hide this field based on other parameters */
    hideIf?: (parameters: Record<string, unknown>) => boolean;
}

export interface TaskValidationContext {
    workflowTasks: Array<{
        taskId: string;
        type: string;
        displayName?: string;
        parameters: Record<string, unknown>;
    }>;
    currentTaskId?: string;
    taskOrder?: string[];
    /** Skip canvas-wiring requirements while the task is being placed. */
    isNewTask?: boolean;
}

export type TaskParameterErrors = Record<string, string>;
