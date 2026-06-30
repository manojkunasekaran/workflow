import {
    COND_ELSE,
    JOIN_MERGE_IN,
    JOIN_OUT,
    MAIN_IN,
    condBranchHandle,
    parBranchHandle,
} from '@/features/workflow-studio/lib/graphHandles';
import type { TaskPluginWiring } from '@/features/workflow-studio/task-type-schema/pluginWiringTypes';

export const CONDITIONAL_TASK_WIRING: TaskPluginWiring = {
    outputs: [
        {
            kind: 'list',
            listParam: 'branches',
            handlePrefix: 'cond',
            labelField: 'name',
            targetParam: 'nextTaskId',
            color: '#8b5cf6',
            routeKind: 'conditional',
            targetHandle: MAIN_IN,
            fallbackLabel: (index) => (index === 0 ? 'If' : `Else if ${index}`),
        },
        {
            kind: 'param',
            handleId: COND_ELSE,
            label: 'Else',
            paramKey: 'defaultNextTaskId',
            color: '#a78bfa',
            routeKind: 'conditional',
            targetHandle: MAIN_IN,
        },
    ],
    mainFlowIn: true,
    mainFlowOut: false,
};

export const BRANCH_TASK_WIRING: TaskPluginWiring = {
    outputs: [
        {
            kind: 'list',
            listParam: 'branches',
            handlePrefix: 'par',
            labelField: 'branchName',
            targetParam: 'startTaskId',
            color: '#f59e0b',
            routeKind: 'parallel',
            targetHandle: MAIN_IN,
            fallbackLabel: (index) => `Branch ${index + 1}`,
        },
    ],
    mainFlowIn: true,
    mainFlowOut: false,
};

export const JOIN_TASK_WIRING: TaskPluginWiring = {
    inputs: [{ id: JOIN_MERGE_IN, label: 'Branches', color: '#d97706' }],
    outputs: [
        {
            kind: 'param',
            handleId: JOIN_OUT,
            label: 'Next',
            paramKey: 'nextTaskId',
            color: '#10b981',
            routeKind: 'join-next',
            targetHandle: MAIN_IN,
        },
    ],
    mainFlowIn: false,
    mainFlowOut: false,
};

// Re-export handle helpers for tests / docs
export { condBranchHandle, parBranchHandle };
