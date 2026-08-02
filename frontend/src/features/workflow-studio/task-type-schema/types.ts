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
    | 'wiredRef'
    | 'waitDuration'
    | 'credential';

/** One parallel path in a BRANCH task — matches backend ParallelBranch. */
export interface ParallelBranchRow {
    branchName: string;
    startTaskId: string;
    /** Last task in this branch chain — wires into Join’s Branches input when a join is linked. */
    endTaskId?: string;
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
